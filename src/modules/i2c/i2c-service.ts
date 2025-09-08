export interface I2CDevice {
	address: number;
	name?: string;
	detected: boolean;
}

export interface I2CStatus {
	isConnected: boolean;
	busNumber: number;
	devices: I2CDevice[];
	lastChecked: string;
	error?: string;
}

export class I2CService {
	private static instance: I2CService;
	private busNumber: number = 1; // Default to I2C bus 1 on Raspberry Pi
	private isInitialized: boolean = false;

	private constructor() {}

	public static getInstance(): I2CService {
		if (!I2CService.instance) {
			I2CService.instance = new I2CService();
		}
		return I2CService.instance;
	}

	/**
	 * Initialize the I2C bus connection
	 */
	public async initialize(busNumber: number = 1): Promise<{ success: boolean; message: string }> {
		try {
			this.busNumber = busNumber;

			// Check if I2C tools are available
			try {
				await Bun.$`which i2cdetect`;
				await Bun.$`which i2cget`;
				await Bun.$`which i2cset`;
			} catch (error) {
				throw new Error("I2C tools not found. Please install i2c-tools: sudo apt-get install i2c-tools");
			}

			// Check if I2C bus device exists
			const devicePath = `/dev/i2c-${busNumber}`;
			try {
				const stat = await Bun.file(devicePath).exists();
				if (!stat) {
					throw new Error(`I2C bus device ${devicePath} not found. Make sure I2C is enabled.`);
				}
			} catch (error) {
				throw new Error(`Cannot access I2C bus device ${devicePath}: ${error}`);
			}

			this.isInitialized = true;
			console.log(`I2C Service: Successfully initialized I2C bus ${busNumber}`);
			return { success: true, message: `I2C bus ${busNumber} initialized successfully` };
		} catch (error) {
			console.error(`I2C Service: Failed to initialize I2C bus ${busNumber}:`, error);
			this.isInitialized = false;
			return {
				success: false,
				message: `Failed to initialize I2C bus ${busNumber}: ${error}`,
			};
		}
	}

	/**
	 * Check if I2C bus is connected and scan for devices
	 */
	public async checkI2CStatus(): Promise<I2CStatus> {
		const status: I2CStatus = {
			isConnected: false,
			busNumber: this.busNumber,
			devices: [],
			lastChecked: new Date().toISOString(),
		};

		try {
			if (!this.isInitialized) {
				status.error = "I2C bus not initialized";
				return status;
			}

			// Test basic I2C communication by attempting to scan for devices
			const devices = await this.scanForDevices();
			status.isConnected = true;
			status.devices = devices;

			console.log(`I2C Service: Bus ${this.busNumber} is connected. Found ${devices.length} devices.`);
		} catch (error) {
			status.error = `I2C communication error: ${error}`;
			console.error(`I2C Service: Error checking I2C status:`, error);
		}

		return status;
	}

	/**
	 * Scan for I2C devices on the bus using i2cdetect
	 */
	public async scanForDevices(): Promise<I2CDevice[]> {
		const devices: I2CDevice[] = [];

		if (!this.isInitialized) {
			throw new Error("I2C bus not initialized");
		}

		try {
			// Use i2cdetect to scan for devices
			const result = await Bun.$`i2cdetect -y ${this.busNumber}`;
			const output = result.stdout.toString();

			// Parse the output from i2cdetect
			// Format is typically:
			//      0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
			// 00:          -- -- -- -- -- -- -- -- -- -- -- -- --
			// 10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
			// 20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
			// 30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
			// 40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
			// 50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
			// 60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
			// 70: -- -- -- -- -- -- -- -- -- -- -- --

			const lines = output.split("\n");
			for (const line of lines) {
				// Skip header lines and empty lines
				if (!line.includes(":") || line.includes("0  1  2  3")) {
					continue;
				}

				// Extract the line number (first two characters)
				const lineMatch = line.match(/^([0-9a-f]{2}):/);
				if (!lineMatch) continue;

				const lineNumber = parseInt(lineMatch[1], 16);

				// Parse the addresses in this line
				const addressMatches = line.match(/([0-9a-f]{2})/g);
				if (addressMatches) {
					// Skip the first match as it's the line number
					for (let i = 1; i < addressMatches.length; i++) {
						const address = parseInt(addressMatches[i], 16);
						if (address !== 0) {
							// 0 means no device
							devices.push({
								address,
								name: this.getDeviceName(address),
								detected: true,
							});

							console.log(`I2C Service: Device found at address 0x${address.toString(16).toUpperCase()}`);
						}
					}
				}
			}
		} catch (error) {
			console.error("I2C Service: Error during device scan:", error);
			throw error;
		}

		return devices;
	}

	/**
	 * Get a human-readable name for a known I2C device address
	 */
	private getDeviceName(address: number): string {
		const knownDevices: { [key: number]: string } = {
			0x1c: "ADXL345 Accelerometer",
			0x1d: "ADXL345 Accelerometer",
			0x1e: "HMC5883L Magnetometer",
			0x20: "PCF8574 I/O Expander",
			0x21: "PCF8574 I/O Expander",
			0x27: "PCF8574 LCD Backpack",
			0x3c: "SSD1306 OLED Display",
			0x3d: "SSD1306 OLED Display",
			0x40: "Si7021 Temperature/Humidity",
			0x48: "ADS1115 ADC",
			0x49: "ADS1115 ADC",
			0x4a: "ADS1115 ADC",
			0x4b: "ADS1115 ADC",
			0x50: "AT24C32 EEPROM",
			0x51: "AT24C32 EEPROM",
			0x52: "AT24C32 EEPROM",
			0x53: "AT24C32 EEPROM",
			0x68: "DS1307 RTC / MPU6050",
			0x69: "MPU6050 Gyroscope",
			0x76: "BME280 Sensor",
			0x77: "BME280 Sensor",
		};

		return knownDevices[address] || `Unknown Device (0x${address.toString(16).toUpperCase()})`;
	}

	/**
	 * Read a byte from a specific I2C address using i2cget
	 */
	public async readByte(address: number): Promise<number> {
		if (!this.isInitialized) {
			throw new Error("I2C bus not initialized");
		}

		try {
			// Use i2cget to read a byte from the device
			const result = await Bun.$`i2cget -y ${this.busNumber} 0x${address.toString(16)}`;
			const output = result.stdout.toString().trim();

			// Parse the hex value (format: 0xXX)
			const byte = parseInt(output, 16);
			console.log(`I2C Service: Read byte 0x${byte.toString(16).toUpperCase()} from address 0x${address.toString(16).toUpperCase()}`);
			return byte;
		} catch (error) {
			console.error(`I2C Service: Error reading from address 0x${address.toString(16).toUpperCase()}:`, error);
			throw error;
		}
	}

	/**
	 * Write a byte to a specific I2C address using i2cset
	 */
	public async writeByte(address: number, byte: number): Promise<void> {
		if (!this.isInitialized) {
			throw new Error("I2C bus not initialized");
		}

		try {
			// Use i2cset to write a byte to the device
			await Bun.$`i2cset -y ${this.busNumber} 0x${address.toString(16)} 0x${byte.toString(16)}`;
			console.log(`I2C Service: Wrote byte 0x${byte.toString(16).toUpperCase()} to address 0x${address.toString(16).toUpperCase()}`);
		} catch (error) {
			console.error(`I2C Service: Error writing to address 0x${address.toString(16).toUpperCase()}:`, error);
			throw error;
		}
	}

	/**
	 * Read multiple bytes from a specific I2C address using i2cget
	 */
	public async readBytes(address: number, length: number): Promise<Buffer> {
		if (!this.isInitialized) {
			throw new Error("I2C bus not initialized");
		}

		try {
			const buffer = Buffer.alloc(length);

			// Read bytes one by one using i2cget
			for (let i = 0; i < length; i++) {
				const result = await Bun.$`i2cget -y ${this.busNumber} 0x${address.toString(16)}`;
				const output = result.stdout.toString().trim();
				const byte = parseInt(output, 16);
				buffer[i] = byte;
			}

			console.log(`I2C Service: Read ${length} bytes from address 0x${address.toString(16).toUpperCase()}`);
			return buffer;
		} catch (error) {
			console.error(`I2C Service: Error reading ${length} bytes from address 0x${address.toString(16).toUpperCase()}:`, error);
			throw error;
		}
	}

	/**
	 * Write multiple bytes to a specific I2C address using i2cset
	 */
	public async writeBytes(address: number, buffer: Buffer): Promise<void> {
		if (!this.isInitialized) {
			throw new Error("I2C bus not initialized");
		}

		try {
			// Convert buffer to hex string for i2cset
			const hexValues = Array.from(buffer)
				.map((byte) => `0x${byte.toString(16).padStart(2, "0")}`)
				.join(" ");

			// Use i2cset to write multiple bytes
			await Bun.$`i2cset -y ${this.busNumber} 0x${address.toString(16)} ${hexValues}`;
			console.log(`I2C Service: Wrote ${buffer.length} bytes to address 0x${address.toString(16).toUpperCase()}`);
		} catch (error) {
			console.error(`I2C Service: Error writing ${buffer.length} bytes to address 0x${address.toString(16).toUpperCase()}:`, error);
			throw error;
		}
	}

	/**
	 * Close the I2C bus connection
	 */
	public async close(): Promise<void> {
		try {
			this.isInitialized = false;
			console.log("I2C Service: Bus connection closed");
		} catch (error) {
			console.error("I2C Service: Error closing bus connection:", error);
			throw error;
		}
	}

	/**
	 * Get current initialization status
	 */
	public isBusInitialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * Get the current bus number
	 */
	public getBusNumber(): number {
		return this.busNumber;
	}
}

export const i2cService = I2CService.getInstance();
