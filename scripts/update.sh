#!/bin/bash
set -e

if [[ -z "$1" ]]; then
  echo "Usage: update-dashboard <version>"
  exit 1
fi

VERSION="$1"
REPO="MonsteRico/led-dashboard"
INSTALL_DIR="/opt/led-dashboard"
TMP_DIR="/tmp/led-dashboard-update"

echo "Updating to version $VERSION..."

# Clean tmp dir
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

# Download release tarball
curl -L "https://github.com/$REPO/releases/download/$VERSION/led-dashboard-$VERSION.tar.gz" \
  -o "$TMP_DIR/update.tar.gz"

# Extract
tar -xzf "$TMP_DIR/update.tar.gz" -C "$TMP_DIR"

# Stop service
sudo systemctl stop dashboard.service

# Replace source files
sudo rm -rf "$INSTALL_DIR/src"
sudo rm -f "$INSTALL_DIR/package.json"
sudo rm -f "$INSTALL_DIR/tsconfig.json"
sudo rm -f "$INSTALL_DIR/bun.lock"

sudo cp -r "$TMP_DIR/src" "$INSTALL_DIR/"
sudo cp "$TMP_DIR/package.json" "$INSTALL_DIR/"
sudo cp "$TMP_DIR/tsconfig.json" "$INSTALL_DIR/"
sudo cp "$TMP_DIR/bun.lock" "$INSTALL_DIR/"
echo "$VERSION" | sudo tee "$INSTALL_DIR/VERSION" > /dev/null

# Ensure build tools are available for native module compilation
echo "Ensuring build tools are available..."
if ! command -v gcc >/dev/null 2>&1 || ! command -v g++ >/dev/null 2>&1; then
    echo "Installing build-essential..."
    sudo apt-get install -y build-essential
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "Installing python3..."
    sudo apt-get install -y python3
fi

if ! command -v make >/dev/null 2>&1; then
    echo "Installing make..."
    sudo apt-get install -y make
fi

# Install dependencies
cd "$INSTALL_DIR"
sudo bun install

# Compile native modules
echo "Compiling native modules..."
echo "Compiling rpi-led-matrix..."
cd node_modules/rpi-led-matrix
if [ -f "binding.gyp" ]; then
    sudo bun run node-gyp rebuild
else
    echo "No binding.gyp found in rpi-led-matrix, skipping compilation"
fi
cd ../..

echo "Compiling sharp..."
cd node_modules/sharp
if [ -f "binding.gyp" ]; then
    sudo bun run node-gyp rebuild
else
    echo "No binding.gyp found in sharp, skipping compilation"
fi
cd ../..

echo "Native module compilation completed"

# Restart service
sudo systemctl start dashboard.service

echo "Update complete. Now running $VERSION."
