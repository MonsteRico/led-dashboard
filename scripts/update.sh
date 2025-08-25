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
echo "Downloading release tarball..."
DOWNLOAD_URL="https://github.com/$REPO/archive/refs/tags/$VERSION.tar.gz"
echo "URL: $DOWNLOAD_URL"

if ! curl -L "$DOWNLOAD_URL" -o "$TMP_DIR/update.tar.gz" --fail --silent --show-error; then
    echo "ERROR: Failed to download release tarball from $DOWNLOAD_URL"
    echo "This could mean:"
    echo "1. The release doesn't exist yet"
    echo "2. The version tag is incorrect"
    echo "3. Network connectivity issues"
    exit 1
fi

# Verify the downloaded file is a valid gzip archive
echo "Verifying downloaded file..."
if ! file "$TMP_DIR/update.tar.gz" | grep -q "gzip compressed data"; then
    echo "ERROR: Downloaded file is not a valid gzip archive"
    echo "File type: $(file "$TMP_DIR/update.tar.gz")"
    echo "This usually means the download failed or the file is corrupted"
    exit 1
fi

# Extract
echo "Extracting release tarball..."
if ! tar -xzf "$TMP_DIR/update.tar.gz" -C "$TMP_DIR"; then
    echo "ERROR: Failed to extract release tarball"
    exit 1
fi

# The source archive extracts to a folder named led-dashboard-{version}
EXTRACTED_DIR="$TMP_DIR/led-dashboard-${VERSION#v}"
echo "Looking for extracted directory: $EXTRACTED_DIR"

# Verify the extracted contents
echo "Verifying extracted contents..."
if [ ! -d "$EXTRACTED_DIR" ]; then
    echo "ERROR: Expected directory $EXTRACTED_DIR not found"
    echo "Contents of $TMP_DIR:"
    ls -la "$TMP_DIR"
    exit 1
fi

if [ ! -d "$EXTRACTED_DIR/src" ] || [ ! -f "$EXTRACTED_DIR/package.json" ]; then
    echo "ERROR: Extracted contents are missing required files (src/ or package.json)"
    echo "Contents of $EXTRACTED_DIR:"
    ls -la "$EXTRACTED_DIR"
    exit 1
fi

# Stop service
echo "Stopping dashboard service..."
sudo systemctl stop dashboard.service

# Replace source files
echo "Replacing source files..."
sudo rm -rf "$INSTALL_DIR/src"
sudo rm -rf "$INSTALL_DIR/scripts"
sudo rm -f "$INSTALL_DIR/package.json"
sudo rm -f "$INSTALL_DIR/tsconfig.json"
sudo rm -f "$INSTALL_DIR/bun.lock"

sudo cp -r "$EXTRACTED_DIR/src" "$INSTALL_DIR/"
sudo cp -r "$EXTRACTED_DIR/scripts" "$INSTALL_DIR/"
sudo cp "$EXTRACTED_DIR/package.json" "$INSTALL_DIR/"
sudo cp "$EXTRACTED_DIR/tsconfig.json" "$INSTALL_DIR/"
sudo cp "$EXTRACTED_DIR/bun.lock" "$INSTALL_DIR/"
echo "$VERSION" | sudo tee "$INSTALL_DIR/VERSION" > /dev/null

# Ensure all files are owned by root since the service runs as root
sudo chown -R root:root "$INSTALL_DIR"

# Make scripts executable
sudo chmod +x "$INSTALL_DIR/scripts"/*

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
echo "Installing dependencies..."
cd "$INSTALL_DIR"
sudo bun install

# Restart service
echo "Starting dashboard service..."
sudo systemctl start dashboard.service

echo "Update complete. Now running $VERSION."
