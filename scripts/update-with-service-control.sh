#!/bin/bash
set -e

# Enable logging to both console and file
exec > >(tee -a /var/log/led-dashboard-update.log) 2>&1

echo "=========================================="
echo "LED Dashboard Update Started: $(date)"
echo "=========================================="

if [[ -z "$1" ]]; then
  echo "Usage: update-with-service-control.sh <version>"
  echo "Example: update-with-service-control.sh v0.0.6"
  exit 1
fi

VERSION="$1"
REPO="MonsteRico/led-dashboard"
INSTALL_DIR="/opt/led-dashboard"
TMP_DIR="/tmp/led-dashboard-update"

echo "Updating to version $VERSION..."

# Step 1: Stop the dashboard service
echo "Step 1: Stopping dashboard service..."
if systemctl is-active --quiet dashboard.service; then
    echo "Dashboard service is running, stopping it..."
    if systemctl stop dashboard.service; then
        echo "Dashboard service stopped successfully"
    else
        echo "ERROR: Failed to stop dashboard service"
        exit 1
    fi
else
    echo "Dashboard service was not running"
fi

# Wait for the service to fully stop
echo "Waiting for dashboard service to fully stop..."
sleep 3

# Verify the service is stopped
if systemctl is-active --quiet dashboard.service; then
    echo "ERROR: Dashboard service is still running after stop attempt"
    exit 1
else
    echo "Dashboard service is confirmed stopped"
fi

# Step 2: Clean tmp dir
echo "Step 2: Cleaning temporary directory..."
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

# Step 3: Download release tarball
echo "Step 3: Downloading release tarball..."
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

# Step 4: Verify the downloaded file is a valid gzip archive
echo "Step 4: Verifying downloaded file..."
if ! file "$TMP_DIR/update.tar.gz" | grep -q "gzip compressed data"; then
    echo "ERROR: Downloaded file is not a valid gzip archive"
    echo "File type: $(file "$TMP_DIR/update.tar.gz")"
    echo "This usually means the download failed or the file is corrupted"
    exit 1
fi

# Step 5: Extract
echo "Step 5: Extracting release tarball..."
if ! tar -xzf "$TMP_DIR/update.tar.gz" -C "$TMP_DIR"; then
    echo "ERROR: Failed to extract release tarball"
    exit 1
fi

# Step 6: The source archive extracts to a folder named led-dashboard-{version}
EXTRACTED_DIR="$TMP_DIR/led-dashboard-${VERSION#v}"
echo "Looking for extracted directory: $EXTRACTED_DIR"

# Step 7: Verify the extracted contents
echo "Step 7: Verifying extracted contents..."
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

# Step 8: Replace source files
echo "Step 8: Replacing source files..."
echo "Removing old files..."
if ! rm -rf "$INSTALL_DIR/src"; then
    echo "WARNING: Failed to remove old src directory"
fi
if ! rm -rf "$INSTALL_DIR/scripts"; then
    echo "WARNING: Failed to remove old scripts directory"
fi
if ! rm -f "$INSTALL_DIR/package.json"; then
    echo "WARNING: Failed to remove old package.json"
fi
if ! rm -f "$INSTALL_DIR/tsconfig.json"; then
    echo "WARNING: Failed to remove old tsconfig.json"
fi
if ! rm -f "$INSTALL_DIR/bun.lock"; then
    echo "WARNING: Failed to remove old bun.lock"
fi

echo "Copying new files..."
if ! cp -r "$EXTRACTED_DIR/src" "$INSTALL_DIR/"; then
    echo "ERROR: Failed to copy src directory"
    exit 1
fi
if ! cp -r "$EXTRACTED_DIR/scripts" "$INSTALL_DIR/"; then
    echo "ERROR: Failed to copy scripts directory"
    exit 1
fi
if ! cp "$EXTRACTED_DIR/package.json" "$INSTALL_DIR/"; then
    echo "ERROR: Failed to copy package.json"
    exit 1
fi
if ! cp "$EXTRACTED_DIR/tsconfig.json" "$INSTALL_DIR/"; then
    echo "ERROR: Failed to copy tsconfig.json"
    exit 1
fi
if ! cp "$EXTRACTED_DIR/bun.lock" "$INSTALL_DIR/"; then
    echo "ERROR: Failed to copy bun.lock"
    exit 1
fi

echo "Updating VERSION file..."
if ! echo "$VERSION" | tee "$INSTALL_DIR/VERSION" > /dev/null; then
    echo "ERROR: Failed to update VERSION file"
    exit 1
fi

echo "Setting file ownership..."
if ! chown -R root:root "$INSTALL_DIR"; then
    echo "ERROR: Failed to set file ownership"
    exit 1
fi

echo "Making scripts executable..."
if ! chmod +x "$INSTALL_DIR/scripts"/*; then
    echo "ERROR: Failed to make scripts executable"
    exit 1
fi

# Step 9: Ensure build tools are available for native module compilation
echo "Step 9: Ensuring build tools are available..."
if ! command -v gcc >/dev/null 2>&1 || ! command -v g++ >/dev/null 2>&1; then
    echo "Installing build-essential..."
    if ! apt-get install -y build-essential; then
        echo "ERROR: Failed to install build-essential"
        exit 1
    fi
    echo "build-essential installed successfully"
else
    echo "build-essential already available"
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "Installing python3..."
    if ! apt-get install -y python3; then
        echo "ERROR: Failed to install python3"
        exit 1
    fi
    echo "python3 installed successfully"
else
    echo "python3 already available"
fi

if ! command -v make >/dev/null 2>&1; then
    echo "Installing make..."
    if ! apt-get install -y make; then
        echo "ERROR: Failed to install make"
        exit 1
    fi
    echo "make installed successfully"
else
    echo "make already available"
fi

# Step 10: Install dependencies
echo "Step 10: Installing dependencies..."
echo "Changing to install directory: $INSTALL_DIR"
if ! cd "$INSTALL_DIR"; then
    echo "ERROR: Failed to change to install directory"
    exit 1
fi

echo "Running bun install..."
if ! bun install; then
    echo "ERROR: Failed to install dependencies with bun install"
    exit 1
fi
echo "Dependencies installed successfully"

# Step 11: Compile native modules
echo "Step 11: Compiling native modules..."
echo "Compiling rpi-led-matrix..."
if ! cd node_modules/rpi-led-matrix; then
    echo "ERROR: Failed to change to rpi-led-matrix directory"
    exit 1
fi

if [ -f "binding.gyp" ]; then
    echo "Found binding.gyp, compiling rpi-led-matrix..."
    if ! bun run node-gyp rebuild; then
        echo "ERROR: Failed to compile rpi-led-matrix"
        exit 1
    fi
    echo "rpi-led-matrix compiled successfully"
else
    echo "No binding.gyp found in rpi-led-matrix, skipping compilation"
fi

if ! cd ../..; then
    echo "ERROR: Failed to return to install directory"
    exit 1
fi

echo "Compiling sharp..."
if ! cd node_modules/sharp; then
    echo "ERROR: Failed to change to sharp directory"
    exit 1
fi

if [ -f "binding.gyp" ]; then
    echo "Found binding.gyp, compiling sharp..."
    if ! bun run node-gyp rebuild; then
        echo "ERROR: Failed to compile sharp"
        exit 1
    fi
    echo "sharp compiled successfully"
else
    echo "No binding.gyp found in sharp, skipping compilation"
fi

if ! cd ../..; then
    echo "ERROR: Failed to return to install directory"
    exit 1
fi

echo "Native module compilation completed successfully"

# Step 12: Start dashboard service
echo "Step 12: Starting dashboard service..."
if ! systemctl start dashboard.service; then
    echo "ERROR: Failed to start dashboard service"
    echo "Attempting to check service status..."
    systemctl status dashboard.service
    exit 1
fi

echo "Dashboard service started successfully"
echo "Checking service status..."
if ! systemctl is-active --quiet dashboard.service; then
    echo "WARNING: Dashboard service is not active after start attempt"
    systemctl status dashboard.service
else
    echo "Dashboard service is running successfully"
fi

echo "=========================================="
echo "Update complete. Now running $VERSION."
echo "Update completed at: $(date)"
echo "=========================================="
