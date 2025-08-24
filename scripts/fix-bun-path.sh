#!/bin/bash
set -e

echo "Fixing Bun path for systemd service..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check multiple possible locations for Bun
BUN_PATH=""

# First check if bun is in PATH
if command_exists bun; then
    BUN_PATH=$(which bun)
    echo "Found Bun in PATH at: $BUN_PATH"
fi

# If not in PATH, check common installation locations
if [ -z "$BUN_PATH" ]; then
    echo "Bun not found in PATH, checking common installation locations..."
    
    # Check current user's .bun directory
    if [ -f "$HOME/.bun/bin/bun" ]; then
        BUN_PATH="$HOME/.bun/bin/bun"
        echo "Found Bun at: $BUN_PATH"
        # Add to PATH for current session
        export PATH="$HOME/.bun/bin:$PATH"
    # Check root user's .bun directory
    elif [ -f "/root/.bun/bin/bun" ]; then
        BUN_PATH="/root/.bun/bin/bun"
        echo "Found Bun at: $BUN_PATH"
    # Check if it's already in /usr/bin
    elif [ -f "/usr/bin/bun" ]; then
        BUN_PATH="/usr/bin/bun"
        echo "Found Bun already at: $BUN_PATH"
    else
        echo "ERROR: Could not find Bun binary in any expected location"
        echo "Expected locations:"
        echo "  - $HOME/.bun/bin/bun"
        echo "  - /root/.bun/bin/bun"
        echo "  - /usr/bin/bun"
        echo "  - In PATH"
        echo ""
        echo "Please install Bun first:"
        echo "curl -fsSL https://bun.sh/install | bash"
        exit 1
    fi
fi

# Create symlink to /usr/bin/bun
echo "Creating symlink: /usr/bin/bun -> $BUN_PATH"
sudo ln -sf "$BUN_PATH" /usr/bin/bun

# Verify the symlink works
if [ -L "/usr/bin/bun" ] && [ -e "/usr/bin/bun" ]; then
    echo "Symlink verified successfully"
    echo "Bun version: $(/usr/bin/bun --version)"
else
    echo "ERROR: Failed to create working symlink"
    exit 1
fi

echo "Bun path fix completed successfully!"
echo "You can now restart the dashboard service:"
echo "sudo systemctl restart dashboard.service"
