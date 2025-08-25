#!/bin/bash
set -e

echo "=========================================="
echo "Simple Update Test - Step by Step"
echo "=========================================="

# Test 1: Check if we can access the install directory
echo "Test 1: Checking install directory..."
INSTALL_DIR="/opt/led-dashboard"
if [ -d "$INSTALL_DIR" ]; then
    echo "✓ Install directory exists"
    echo "Contents: $(ls -la "$INSTALL_DIR" | wc -l) items"
else
    echo "✗ Install directory does not exist"
    exit 1
fi

# Test 2: Check if we can create a temporary directory
echo "Test 2: Creating temporary directory..."
TMP_DIR="/tmp/led-dashboard-test"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
if [ -d "$TMP_DIR" ]; then
    echo "✓ Temporary directory created"
else
    echo "✗ Failed to create temporary directory"
    exit 1
fi

# Test 3: Test download
echo "Test 3: Testing download..."
VERSION="v0.0.5"
REPO="MonsteRico/led-dashboard"
DOWNLOAD_URL="https://github.com/$REPO/archive/refs/tags/$VERSION.tar.gz"
echo "Downloading from: $DOWNLOAD_URL"

if curl -L "$DOWNLOAD_URL" -o "$TMP_DIR/test.tar.gz" --fail --silent --show-error; then
    echo "✓ Download successful"
    echo "File size: $(ls -lh "$TMP_DIR/test.tar.gz" | awk '{print $5}')"
else
    echo "✗ Download failed"
    exit 1
fi

# Test 4: Test extraction
echo "Test 4: Testing extraction..."
if tar -xzf "$TMP_DIR/test.tar.gz" -C "$TMP_DIR"; then
    echo "✓ Extraction successful"
    echo "Extracted contents:"
    ls -la "$TMP_DIR"
else
    echo "✗ Extraction failed"
    exit 1
fi

# Test 5: Check extracted structure
echo "Test 5: Checking extracted structure..."
EXTRACTED_DIR="$TMP_DIR/led-dashboard-${VERSION#v}"
if [ -d "$EXTRACTED_DIR" ]; then
    echo "✓ Extracted directory found: $EXTRACTED_DIR"
    echo "Contents:"
    ls -la "$EXTRACTED_DIR"
else
    echo "✗ Extracted directory not found"
    echo "Available in $TMP_DIR:"
    ls -la "$TMP_DIR"
    exit 1
fi

# Test 6: Check required files
echo "Test 6: Checking required files..."
if [ -d "$EXTRACTED_DIR/src" ]; then
    echo "✓ src directory exists"
else
    echo "✗ src directory missing"
    exit 1
fi

if [ -f "$EXTRACTED_DIR/package.json" ]; then
    echo "✓ package.json exists"
else
    echo "✗ package.json missing"
    exit 1
fi

if [ -d "$EXTRACTED_DIR/scripts" ]; then
    echo "✓ scripts directory exists"
else
    echo "✗ scripts directory missing"
    exit 1
fi

# Test 7: Test file operations (without actually doing them)
echo "Test 7: Testing file operation permissions..."
if sudo test -w "$INSTALL_DIR"; then
    echo "✓ Install directory is writable"
else
    echo "✗ Install directory is not writable"
    exit 1
fi

# Test 8: Test service operations
echo "Test 8: Testing service operations..."
if systemctl is-active --quiet dashboard.service; then
    echo "✓ Dashboard service is running"
    echo "Testing stop..."
    if sudo systemctl stop dashboard.service; then
        echo "✓ Service stopped successfully"
        echo "Testing start..."
        if sudo systemctl start dashboard.service; then
            echo "✓ Service started successfully"
        else
            echo "✗ Service failed to start"
            systemctl status dashboard.service --no-pager
        fi
    else
        echo "✗ Service failed to stop"
        systemctl status dashboard.service --no-pager
    fi
else
    echo "✓ Dashboard service is not running (this is OK)"
fi

echo "=========================================="
echo "All tests completed successfully!"
echo "The update should work. Try running:"
echo "sudo /opt/led-dashboard/scripts/update-direct.sh v0.0.5"
echo "=========================================="
