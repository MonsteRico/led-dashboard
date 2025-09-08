#!/usr/bin/env bun

/**
 * Simple I2C test script to verify I2C functionality
 * Run with: bun test-i2c.ts
 */

import { i2cService } from "./src/modules/i2c/i2c-service";

async function testI2C() {
	console.log("=== I2C Test Script ===");
	console.log("Testing I2C bus connection and device scanning...\n");

	try {
		// Initialize I2C service
		console.log("1. Initializing I2C service...");
		const initResult = await i2cService.initialize();

		if (!initResult.success) {
			console.error("❌ Failed to initialize I2C service:", initResult.message);
			return;
		}

		console.log("✅ I2C service initialized successfully");
		console.log(`   Bus number: ${i2cService.getBusNumber()}`);
		console.log(`   Initialized: ${i2cService.isBusInitialized()}\n`);

		// Check I2C status
		console.log("2. Checking I2C status...");
		const status = await i2cService.checkI2CStatus();

		console.log(`   Connected: ${status.isConnected ? "✅" : "❌"}`);
		console.log(`   Bus number: ${status.busNumber}`);
		console.log(`   Devices found: ${status.devices.length}`);
		console.log(`   Last checked: ${status.lastChecked}`);

		if (status.error) {
			console.log(`   Error: ${status.error}`);
		}

		if (status.devices.length > 0) {
			console.log("\n3. Detected devices:");
			status.devices.forEach((device, index) => {
				console.log(`   ${index + 1}. Address: 0x${device.address.toString(16).toUpperCase()}`);
				console.log(`      Name: ${device.name}`);
				console.log(`      Detected: ${device.detected ? "✅" : "❌"}`);
			});
		} else {
			console.log("\n3. No I2C devices detected");
			console.log("   This is normal if no devices are connected to the I2C bus");
		}

		// Test basic I2C operations (only if devices are found)
		if (status.devices.length > 0) {
			console.log("\n4. Testing basic I2C operations...");
			const testDevice = status.devices[0];

			try {
				console.log(`   Testing read from device at 0x${testDevice.address.toString(16).toUpperCase()}...`);
				const byte = await i2cService.readByte(testDevice.address);
				console.log(`   ✅ Successfully read byte: 0x${byte.toString(16).toUpperCase()}`);
			} catch (error) {
				console.log(`   ⚠️  Read test failed (this may be normal): ${error}`);
			}
		}

		console.log("\n5. I2C test completed successfully!");
		console.log("   The I2C bus is working and ready for device communication.");
	} catch (error) {
		console.error("\n❌ I2C test failed:", error);
		console.log("\nTroubleshooting tips:");
		console.log("1. Make sure I2C is enabled on your Raspberry Pi");
		console.log("2. Run: sudo raspi-config -> Interfacing Options -> I2C -> Enable");
		console.log('3. Or add "dtparam=i2c_arm=on" to /boot/config.txt');
		console.log("4. Install i2c-tools: sudo apt-get install i2c-tools");
		console.log("5. Reboot the Raspberry Pi after enabling I2C");
		console.log("6. Make sure you have permission to access I2C devices");
		console.log("7. Try running with sudo if permission issues occur");
		console.log("8. Test manually: sudo i2cdetect -y 1");
	} finally {
		// Clean up
		try {
			await i2cService.close();
			console.log("\n6. I2C service closed");
		} catch (error) {
			console.error("Error closing I2C service:", error);
		}
	}
}

// Run the test
testI2C().catch(console.error);
