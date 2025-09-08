import Color from "color";
import type DevMatrix from "@/DevMatrix";
import App from "./app";
import { fonts } from "@/modules/preload/preload";
import { i2cService } from "@/modules/i2c/i2c-service";

export default class I2CTest extends App {
	private statusText = "Initializing I2C...";
	private deviceCount = 0;
	private lastCheck = "";
	private isInitialized = false;
	private checkInterval: NodeJS.Timeout | null = null;

	constructor(matrix: DevMatrix) {
		super(matrix);
		this.initializeI2C();
	}

	private async initializeI2C() {
		try {
			console.log("I2C Test App: Initializing I2C service...");
			const result = await i2cService.initialize();

			if (result.success) {
				this.isInitialized = true;
				this.statusText = "I2C Connected";
				console.log("I2C Test App: I2C service initialized successfully");

				// Start periodic status checks
				this.startStatusChecks();
			} else {
				this.statusText = `I2C Error: ${result.message}`;
				console.error("I2C Test App: Failed to initialize I2C service:", result.message);
			}
		} catch (error) {
			this.statusText = `I2C Error: ${error}`;
			console.error("I2C Test App: Error initializing I2C service:", error);
		}
	}

	private startStatusChecks() {
		// Check I2C status every 5 seconds
		this.checkInterval = setInterval(async () => {
			if (this.isInitialized) {
				await this.checkI2CStatus();
			}
		}, 5000);

		// Initial check
		this.checkI2CStatus();
	}

	private async checkI2CStatus() {
		try {
			const status = await i2cService.checkI2CStatus();
			this.deviceCount = status.devices.length;
			this.lastCheck = new Date().toLocaleTimeString();

			if (status.isConnected) {
				this.statusText = `I2C: ${this.deviceCount} devices`;
				console.log(`I2C Test App: Status check - ${this.deviceCount} devices found on bus ${status.busNumber}`);

				// Log each detected device
				status.devices.forEach((device) => {
					console.log(`I2C Test App: Device at 0x${device.address.toString(16).toUpperCase()}: ${device.name}`);
				});
			} else {
				this.statusText = `I2C Error: ${status.error || "Unknown error"}`;
				console.error("I2C Test App: I2C status check failed:", status.error);
			}
		} catch (error) {
			this.statusText = `I2C Error: ${error}`;
			console.error("I2C Test App: Error checking I2C status:", error);
		}
	}

	public update() {
		// Clear the matrix
		this.matrix.fgColor(new Color("#000000"));
		this.matrix.fill();

		// Set text color based on I2C status
		if (this.isInitialized && this.deviceCount > 0) {
			this.matrix.fgColor(new Color("#00ff00")); // Green for connected with devices
		} else if (this.isInitialized) {
			this.matrix.fgColor(new Color("#ffff00")); // Yellow for connected but no devices
		} else {
			this.matrix.fgColor(new Color("#ff0000")); // Red for error
		}

		// Draw status text
		this.matrix.font(fonts["4x6"]);
		this.matrix.drawText(this.statusText, 2, 8);

		// Draw device count
		if (this.isInitialized) {
			this.matrix.font(fonts["4x6"]);
			this.matrix.drawText(`Devices: ${this.deviceCount}`, 2, 16);
		}

		// Draw last check time
		if (this.lastCheck) {
			this.matrix.font(fonts["4x6"]);
			this.matrix.drawText(`Last: ${this.lastCheck}`, 2, 24);
		}

		// Draw instructions
		this.matrix.fgColor(new Color("#ffffff"));
		this.matrix.font(fonts["4x6"]);
		this.matrix.drawText("Press: Scan", 2, 32);
	}

	public handlePress(): void {
		console.log("I2C Test App: Manual scan triggered");
		if (this.isInitialized) {
			this.checkI2CStatus();
		}
	}

	public handleDoublePress(): void {
		console.log("I2C Test App: Reinitializing I2C service");
		this.initializeI2C();
	}

	public handleTriplePress(): void {
		console.log("I2C Test App: Toggling status check interval");
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
			this.statusText = "Checks paused";
		} else {
			this.startStatusChecks();
		}
	}

	public handleLongPress(): void {
		console.log("I2C Test App: Closing I2C service");
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}

		i2cService
			.close()
			.then(() => {
				this.isInitialized = false;
				this.statusText = "I2C Closed";
				console.log("I2C Test App: I2C service closed");
			})
			.catch((error) => {
				console.error("I2C Test App: Error closing I2C service:", error);
			});
	}

	public destroy(): void {
		// Clean up interval when app is destroyed
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
		console.log("I2C Test App: App destroyed, cleanup complete");
	}
}
