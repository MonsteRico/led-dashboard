#!/bin/bash
set -e

echo "Fixing native modules for LED Dashboard..."

INSTALL_DIR="/opt/led-dashboard"
REPO_DIR=$(pwd)

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

if ! command_exists bun; then
    echo "ERROR: Bun not found. Please install Bun first."
    exit 1
fi

echo "[1/4] Installing dependencies..."
bun install

echo "[2/4] Compiling native modules..."
# Rebuild native modules to ensure they're compiled for the current platform
cd node_modules/rpi-led-matrix
if [ -f "binding.gyp" ]; then
    echo "Compiling rpi-led-matrix..."
    node-gyp rebuild
else
    echo "No binding.gyp found in rpi-led-matrix, skipping compilation"
fi
cd ../..

echo "[3/4] Building TypeScript with Bun..."
bun build src/index.ts --outdir dist --target bun

echo "[4/4] Copying native modules to build directory..."
# Create the build directory structure for native modules
mkdir -p dist/build/Release

# Copy the compiled native module
if [ -f "node_modules/rpi-led-matrix/build/Release/rpi-led-matrix.node" ]; then
    cp node_modules/rpi-led-matrix/build/Release/rpi-led-matrix.node dist/build/Release/
    echo "Copied rpi-led-matrix.node to dist/build/Release/"
else
    echo "WARNING: rpi-led-matrix.node not found. The build may fail at runtime."
fi

# Copy any other native modules that might be needed
if [ -d "node_modules/sharp/build/Release" ]; then
    mkdir -p dist/node_modules/sharp/build/Release
    cp node_modules/sharp/build/Release/*.node dist/node_modules/sharp/build/Release/ 2>/dev/null || true
    echo "Copied sharp native modules"
fi

echo "Copying updated build to installation directory..."
sudo cp -r dist "$INSTALL_DIR/"

echo "Native modules fix completed successfully!"
echo "You can now restart the dashboard service:"
echo "sudo systemctl restart dashboard.service"
