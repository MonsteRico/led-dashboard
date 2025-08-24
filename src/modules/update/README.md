# Update Module

This module provides update checking and installation functionality for the LED Dashboard.

## Features

- **Check for Updates**: Queries GitHub releases to check if a newer version is available
- **Perform Updates**: Downloads and installs the latest version from GitHub releases
- **Version Management**: Tracks current and latest versions

## API

### `UpdateService`

#### `checkForUpdates(): Promise<UpdateInfo>`

Checks for available updates by running the `check-for-updates.sh` script.

Returns:

- `currentVersion`: Current installed version
- `latestVersion`: Latest available version from GitHub
- `updateAvailable`: Boolean indicating if an update is available

#### `performUpdate(version: string): Promise<UpdateResult>`

Performs an update to the specified version by running the `update.sh` script.

Returns:

- `success`: Boolean indicating if the update was successful
- `message`: Human-readable message about the result
- `error`: Error details if the update failed

## Files

- `update-service.ts`: Main update service with script execution and graceful shutdown
- `shutdown-utility.ts`: Graceful shutdown utilities for clean service termination
- `README.md`: Detailed documentation for the update module

## Dependencies

This module depends on the following shell scripts in the `scripts/` directory:

- `check-for-updates.sh`: Checks for available updates
- `update.sh`: Performs the actual update

## Usage

````typescript
import { updateService } from "@/modules/update/update-service";

// Check for updates
const updateInfo = await updateService.checkForUpdates();
console.log(`Current: ${updateInfo.currentVersion}, Latest: ${updateInfo.latestVersion}`);

// Perform update if available
if (updateInfo.updateAvailable) {
    const result = await updateService.performUpdate(updateInfo.latestVersion);
    if (result.success) {
        console.log("Update completed successfully");
    } else {
        console.error("Update failed:", result.error);
    }
}

## Update Process

The update process follows these steps:

1. **Graceful Shutdown**: The service gracefully shuts down all components:
   - Stops all running apps and clears background intervals
   - Clears the LED matrix display
   - Prepares the web server for shutdown

2. **Update Execution**: The update script is executed in a detached process:
   - Downloads the new version from GitHub
   - Installs the update
   - Restarts the system service

3. **Process Termination**: The current process exits cleanly:
   - Ensures the HTTP response is sent to the client
   - Exits with code 0 to indicate successful shutdown

## Configuration

The update service automatically detects the environment:
- **Development**: Uses scripts from the project root (`./scripts/`)
- **Production**: Uses scripts from the installation directory (`/opt/led-dashboard/scripts/`)

## App Context Setup

The update service requires app context to be set before performing updates:

```typescript
// In index.ts after apps are created
updateService.setAppContext({
    apps: enabledApps,
    matrix: matrix,
    webServer: webServer
});
````

## Security

- Update scripts require proper permissions to execute
- Scripts should be executable: `chmod +x scripts/*.sh`
- The service validates script existence before execution
- Graceful shutdown ensures no data corruption during updates
