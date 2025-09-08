import { I2CBus, openSync } from "i2c-bus";

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
	private bus: I2CBus | null = null;
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

			// Close existing connection if any
			if (this.bus) {
				this.bus.closeSync();
				this.bus = null;
			}

			// Open I2C bus
			this.bus = openSync(busNumber);
			this.isInitialized = true;

			console.log(`I2C Service: Successfully connected to I2C bus ${busNumber}`);
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
			if (!this.isInitialized || !this.bus) {
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
	 * Scan for I2C devices on the bus
	 */
	public async scanForDevices(): Promise<I2CDevice[]> {
		const devices: I2CDevice[] = [];

		if (!this.bus) {
			throw new Error("I2C bus not initialized");
		}

		try {
			// Scan addresses 0x03 to 0x77 (valid I2C address range)
			for (let address = 0x03; address <= 0x77; address++) {
				try {
					// Try to read a byte from the address
					// This will throw an error if no device responds
					this.bus.receiveByteSync(address);

					// If we get here, a device responded
					devices.push({
						address,
						name: this.getDeviceName(address),
						detected: true,
					});

					console.log(`I2C Service: Device found at address 0x${address.toString(16).toUpperCase()}`);
				} catch (error) {
					// No device at this address, continue scanning
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
	 * Read a byte from a specific I2C address
	 */
	public async readByte(address: number): Promise<number> {
		if (!this.bus) {
			throw new Error("I2C bus not initialized");
		}

		try {
			const byte = this.bus.receiveByteSync(address);
			console.log(`I2C Service: Read byte 0x${byte.toString(16).toUpperCase()} from address 0x${address.toString(16).toUpperCase()}`);
			return byte;
		} catch (error) {
			console.error(`I2C Service: Error reading from address 0x${address.toString(16).toUpperCase()}:`, error);
			throw error;
		}
	}

	/**
	 * Write a byte to a specific I2C address
	 */
	public async writeByte(address: number, byte: number): Promise<void> {
		if (!this.bus) {
			throw new Error("I2C bus not initialized");
		}

		try {
			this.bus.sendByteSync(address, byte);
			console.log(`I2C Service: Wrote byte 0x${byte.toString(16).toUpperCase()} to address 0x${address.toString(16).toUpperCase()}`);
		} catch (error) {
			console.error(`I2C Service: Error writing to address 0x${address.toString(16).toUpperCase()}:`, error);
			throw error;
		}
	}

	/**
	 * Read multiple bytes from a specific I2C address
	 */
	public async readBytes(address: number, length: number): Promise<Buffer> {
		if (!this.bus) {
			throw new Error("I2C bus not initialized");
		}

		try {
			const buffer = Buffer.alloc(length);
			this.bus.i2cReadSync(address, length, buffer);
			console.log(`I2C Service: Read ${length} bytes from address 0x${address.toString(16).toUpperCase()}`);
			return buffer;
		} catch (error) {
			console.error(`I2C Service: Error reading ${length} bytes from address 0x${address.toString(16).toUpperCase()}:`, error);
			throw error;
		}
	}

	/**
	 * Write multiple bytes to a specific I2C address
	 */
	public async writeBytes(address: number, buffer: Buffer): Promise<void> {
		if (!this.bus) {
			throw new Error("I2C bus not initialized");
		}

		try {
			this.bus.i2cWriteSync(address, buffer.length, buffer);
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
			if (this.bus) {
				this.bus.closeSync();
				this.bus = null;
				this.isInitialized = false;
				console.log("I2C Service: Bus connection closed");
			}
		} catch (error) {
			console.error("I2C Service: Error closing bus connection:", error);
			throw error;
		}
	}

	/**
	 * Get current initialization status
	 */
	public isBusInitialized(): boolean {
		return this.isInitialized && this.bus !== null;
	}

	/**
	 * Get the current bus number
	 */
	public getBusNumber(): number {
		return this.busNumber;
	}
}

export const i2cService = I2CService.getInstance();
