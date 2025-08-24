# Environment Service Module

This module provides environment variable management functionality for the LED Dashboard system. It allows users to configure environment variables through the web interface and automatically manages app requirements.

## Features

- **Environment Variable Management**: Edit and save environment variables through web interface
- **Validation**: Built-in validation for different variable types (string, boolean, URL)
- **Security**: Hidden variables are masked by default with show/hide toggle
- **App Requirements**: Automatic app disabling when required environment variables are missing
- **File Persistence**: Saves changes to .env file
- **Automatic Reboot**: Reboots device after environment variable changes

## Supported Environment Variables

### LED_DASHBOARD_WEB_KEY

- **Type**: String
- **Max Length**: 128 characters
- **Hidden**: Yes
- **Required For**: Canvas app
- **Description**: API key for LED dashboard web service

### USE_HTTPS

- **Type**: Boolean
- **Allowed Values**: "true", "false"
- **Hidden**: No
- **Required For**: None
- **Description**: Enable HTTPS for the web server

### SPOTIFY_CLIENT_ID

- **Type**: String
- **Hidden**: Yes
- **Required For**: Spotify app
- **Description**: Spotify API Client ID

### SPOTIFY_CLIENT_SECRET

- **Type**: String
- **Hidden**: Yes
- **Required For**: Spotify app
- **Description**: Spotify API Client Secret

### SPOTIFY_REDIRECT_URI

- **Type**: URL
- **Hidden**: No
- **Required For**: None
- **Description**: This should be set to `https://{your devices local ip}:3000/api/spotify/callback`

## API Endpoints

### GET /api/env/variables

Returns all environment variables with their current values and metadata.

**Response:**

```json
[
    {
        "name": "SPOTIFY_CLIENT_ID",
        "value": "your_client_id_here",
        "description": "Spotify API Client ID",
        "isHidden": true,
        "isRequired": false,
        "validation": {
            "type": "string"
        }
    }
]
```

### POST /api/env/variables

Updates environment variables and saves to .env file.

**Request Body:**

```json
{
    "variables": [
        {
            "name": "SPOTIFY_CLIENT_ID",
            "value": "new_client_id"
        }
    ]
}
```

**Response:**

```json
{
    "success": true,
    "message": "Environment variables updated successfully"
}
```

### POST /api/env/reboot

Reboots the device after a 3-second delay.

**Response:**

```json
{
    "success": true,
    "message": "Device will reboot in 3 seconds"
}
```

## App Requirements

The service automatically checks environment variable requirements for apps:

- **Spotify App**: Requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
- **Canvas App**: Requires `LED_DASHBOARD_WEB_KEY`

If required environment variables are missing, the corresponding app will be automatically disabled.

## File Operations

The service reads and writes to the `.env` file in the project root directory. If the file doesn't exist, it will be created automatically with a helpful header comment. The file format follows standard environment variable syntax:

```
# LED Dashboard Environment Variables
# This file contains environment variables for the LED Dashboard application
# Edit these values through the web interface or manually
#
# Generated on: 2024-01-01T00:00:00.000Z
#

VARIABLE_NAME=value
ANOTHER_VARIABLE=another_value
```

**Note**: The `.env` file is automatically ignored by git (as specified in `.gitignore`), so your sensitive environment variables will not be committed to version control.

## Usage

1. Access the web interface
2. Navigate to the "Environment Variables" section
3. Edit variable values as needed
4. Use the show/hide toggle for sensitive variables
5. Click "Save & Reboot" to apply changes
6. The device will reboot automatically after saving

## Validation Rules

- **String Variables**: No special validation unless maxLength is specified
- **Boolean Variables**: Must be "true" or "false"
- **URL Variables**: Must be valid URL format
- **Max Length**: Enforced for variables with maxLength validation

## Error Handling

The service includes comprehensive error handling for:

- Invalid variable names
- Validation failures
- File system errors
- Network errors during reboot

All errors are logged to the console and returned to the client with appropriate error messages.
