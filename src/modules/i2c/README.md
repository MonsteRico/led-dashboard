# I2C Service Module

This module provides I2C (Inter-Integrated Circuit) bus communication functionality for the LED Dashboard project. It uses the built-in Linux I2C tools (`i2cdetect`, `i2cget`, `i2cset`) to interface with I2C devices connected to the Raspberry Pi.

## Features

- **Bus Initialization**: Connect to I2C bus 1 (default) or specify a different bus number
- **Device Scanning**: Automatically scan for I2C devices on the bus
- **Device Recognition**: Identify common I2C devices by their addresses
- **Read/Write Operations**: Support for single byte and multi-byte operations
- **Status Monitoring**: Check I2C bus connection status and device availability
- **Error Handling**: Comprehensive error handling and logging

## Usage

### Basic Setup

```typescript
import { i2cService } from "@/modules/i2c/i2c-service";

// Initialize I2C bus (defaults to bus 1)
const result = await i2cService.initialize();
if (result.success) {
	console.log("I2C bus initialized successfully");
} else {
	console.error("Failed to initialize I2C bus:", result.message);
}
```

### Check I2C Status

```typescript
// Check if I2C bus is connected and scan for devices
const status = await i2cService.checkI2CStatus();
console.log("I2C Status:", status);

if (status.isConnected) {
	console.log(`Found ${status.devices.length} devices on bus ${status.busNumber}`);
	status.devices.forEach((device) => {
		console.log(`Device at 0x${device.address.toString(16)}: ${device.name}`);
	});
} else {
	console.error("I2C bus not connected:", status.error);
}
```

### Reading from I2C Devices

```typescript
// Read a single byte from address 0x48
try {
	const byte = await i2cService.readByte(0x48);
	console.log("Read byte:", byte);
} catch (error) {
	console.error("Read failed:", error);
}

// Read multiple bytes
try {
	const buffer = await i2cService.readBytes(0x48, 4);
	console.log("Read buffer:", buffer);
} catch (error) {
	console.error("Read failed:", error);
}
```

### Writing to I2C Devices

```typescript
// Write a single byte to address 0x48
try {
	await i2cService.writeByte(0x48, 0x01);
	console.log("Write successful");
} catch (error) {
	console.error("Write failed:", error);
}

// Write multiple bytes
try {
	const buffer = Buffer.from([0x01, 0x02, 0x03]);
	await i2cService.writeBytes(0x48, buffer);
	console.log("Write successful");
} catch (error) {
	console.error("Write failed:", error);
}
```

### Cleanup

```typescript
// Close I2C bus connection when done
await i2cService.close();
```

## Known Device Addresses

The service recognizes common I2C device addresses:

- **0x1C, 0x1D**: ADXL345 Accelerometer
- **0x1E**: HMC5883L Magnetometer
- **0x20, 0x21**: PCF8574 I/O Expander
- **0x27**: PCF8574 LCD Backpack
- **0x3C, 0x3D**: SSD1306 OLED Display
- **0x40**: Si7021 Temperature/Humidity Sensor
- **0x48-0x4B**: ADS1115 ADC
- **0x50-0x53**: AT24C32 EEPROM
- **0x68**: DS1307 RTC / MPU6050
- **0x69**: MPU6050 Gyroscope
- **0x76, 0x77**: BME280 Sensor

## Error Handling

The service provides comprehensive error handling:

- **Initialization Errors**: Check if I2C bus can be opened
- **Communication Errors**: Handle device communication failures
- **Device Not Found**: Gracefully handle missing devices
- **Bus Errors**: Detect and report bus-level issues

## Requirements

- Raspberry Pi with I2C enabled
- `i2c-tools` package installed (`sudo apt-get install i2c-tools`)
- Proper permissions to access I2C devices (usually requires running as root or adding user to i2c group)

## Enabling I2C on Raspberry Pi

To enable I2C on Raspberry Pi:

1. Run `sudo raspi-config`
2. Navigate to "Interfacing Options" → "I2C"
3. Enable I2C
4. Reboot the system

Or manually enable by adding to `/boot/config.txt`:

```
dtparam=i2c_arm=on
```

## Logging

The service logs all I2C operations to the console, including:

- Bus initialization status
- Device discovery
- Read/write operations
- Error conditions

This helps with debugging and monitoring I2C communication.

## Advantages of Using System I2C Tools

- **No Native Dependencies**: Avoids Node.js/Bun compatibility issues with native modules
- **System Integration**: Uses the same tools that system administrators use
- **Reliability**: Leverages well-tested Linux I2C subsystem
- **No Compilation**: No need to compile native code for different architectures
- **Easy Debugging**: Can manually test with the same commands the service uses
