# WiFi Service Module

This module provides WiFi configuration functionality for the LED Dashboard system. It allows users to configure WiFi credentials through the web interface and automatically manages network connectivity.

## Features

- **Internet Connectivity Check**: Pings 8.8.8.8 to verify internet connection
- **Network Status Monitoring**: Tracks local IP, current SSID, and connection status
- **WiFi Configuration**: Allows setting up WiFi credentials through web interface
- **Automatic Reboot**: Reboots device after WiFi configuration
- **Configuration Persistence**: Saves network status to global config

## API Endpoints

### GET /api/network/status

Returns current network status including:

- `hasInternet`: Boolean indicating internet connectivity
- `localIp`: Device's local IP address
- `currentSSID`: Currently connected WiFi network
- `lastChecked`: Timestamp of last status check

### POST /api/network/configure

Configures WiFi with provided credentials and reboots device.

**Request Body:**

```json
{
    "ssid": "WiFi Network Name",
    "password": "WiFi Password"
}
```

**Response:**

```json
{
    "success": true,
    "message": "WiFi configured successfully. Device will reboot in 3 seconds."
}
```

## System Requirements

The WiFi service requires the following system commands to be available:

- `ping` - For internet connectivity testing
- `hostname` - For getting local IP address
- `iwgetid` - For getting current WiFi SSID
- `systemctl` - For restarting networking services
- `reboot` - For rebooting the device

## File Operations

The service writes WiFi configuration to `/etc/wpa_supplicant/wpa_supplicant.conf` in the standard wpa_supplicant format.

## Usage

1. Access the web interface
2. Check network status in the "Network Configuration" section
3. If no internet connection is detected, a WiFi configuration form will appear
4. Enter WiFi SSID and password
5. Submit the form to configure WiFi and reboot the device

## Error Handling

The service includes comprehensive error handling for:

- Network command failures
- File system errors
- Invalid credentials
- System service failures

All errors are logged to the console and returned to the client with appropriate error messages.
