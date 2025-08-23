# Control Service Module

This module provides dashboard control simulation functionality for the LED Dashboard system. It allows users to trigger various press and rotation functions through the web interface, simulating the physical button interactions.

## Features

- **Press Simulation**: Single, double, triple, and long press simulation
- **Rotation Simulation**: Left and right rotation simulation
- **Real-time Status**: Current app information and position
- **Web Interface**: Easy-to-use buttons for all control functions
- **Error Handling**: Comprehensive error handling and user feedback

## Control Functions

### Press Controls

- **Single Press**: Simulates a single button press (switches apps or triggers app-specific action)
- **Double Press**: Simulates a double button press (triggers app-specific double press action)
- **Triple Press**: Simulates a triple button press (triggers app-specific triple press action)
- **Long Press**: Simulates a long button press (triggers app-specific long press action)

### Rotation Controls

- **Rotate Left**: Simulates rotating left (triggers app-specific left rotation action)
- **Rotate Right**: Simulates rotating right (triggers app-specific right rotation action)

## API Endpoints

### GET /api/control/status

Returns current dashboard status including app information.

**Response:**

```json
{
    "currentApp": 0,
    "totalApps": 5,
    "appName": "Clock"
}
```

### POST /api/control/single-press

Triggers a single press action.

**Response:**

```json
{
    "success": true,
    "message": "Single press triggered successfully"
}
```

### POST /api/control/double-press

Triggers a double press action.

**Response:**

```json
{
    "success": true,
    "message": "Double press triggered successfully"
}
```

### POST /api/control/triple-press

Triggers a triple press action.

**Response:**

```json
{
    "success": true,
    "message": "Triple press triggered successfully"
}
```

### POST /api/control/long-press

Triggers a long press action.

**Response:**

```json
{
    "success": true,
    "message": "Long press triggered successfully"
}
```

### POST /api/control/rotate-left

Triggers a rotate left action.

**Response:**

```json
{
    "success": true,
    "message": "Rotate left triggered successfully"
}
```

### POST /api/control/rotate-right

Triggers a rotate right action.

**Response:**

```json
{
    "success": true,
    "message": "Rotate right triggered successfully"
}
```

## Integration

The control service integrates with the main application by:

1. **Handler Registration**: The main application registers control handlers during startup
2. **App Information**: The service tracks current app information and updates it when apps switch
3. **Web Interface**: The web server provides endpoints that trigger the registered handlers
4. **Real-time Updates**: Status is updated in real-time as the dashboard state changes

## Usage

1. Access the web interface
2. Navigate to the "Dashboard Controls" section
3. View current app status and position
4. Use the control buttons to simulate various interactions
5. Monitor the status messages for feedback

## Error Handling

The service includes comprehensive error handling for:

- Missing handlers
- Handler execution errors
- Network communication errors
- Invalid requests

All errors are logged to the console and returned to the client with appropriate error messages.

## Security

The control service is designed for local network use only. All endpoints should be accessed from the local network where the dashboard is running.
