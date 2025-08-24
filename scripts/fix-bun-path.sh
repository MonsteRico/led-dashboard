#!/bin/bash
set -e

echo "Fixing Bun path for systemd service..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Bun is installed and find its location
if command_exists bun; then
    BUN_PATH=$(which bun)
    echo "Found Bun at: $BUN_PATH"
    
    # Create symlink to /usr/bin/bun
    sudo ln -sf $BUN_PATH /usr/bin/bun
    echo "Created symlink: /usr/bin/bun -> $BUN_PATH"
    
    # Verify the symlink works
    if [ -L "/usr/bin/bun" ] && [ -e "/usr/bin/bun" ]; then
        echo "Symlink verified successfully"
        echo "Bun version: $(/usr/bin/bun --version)"
    else
        echo "ERROR: Failed to create working symlink"
        exit 1
    fi
else
    echo "ERROR: Bun not found in PATH"
    echo "Please run the install script first: ./scripts/install.sh"
    exit 1
fi

echo "Bun path fix completed successfully!"
echo "You can now restart the dashboard service:"
echo "sudo systemctl restart dashboard.service"
