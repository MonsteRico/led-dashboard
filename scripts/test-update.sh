#!/bin/bash
set -e

if [[ -z "$1" ]]; then
  echo "Usage: test-update <version>"
  echo "Example: test-update v0.0.5"
  exit 1
fi

VERSION="$1"
REPO="MonsteRico/led-dashboard"
TMP_DIR="/tmp/led-dashboard-test"

echo "Testing update for version $VERSION..."

# Clean tmp dir
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

# Check if release exists
echo "Checking if release exists..."
RELEASE_URL="https://api.github.com/repos/$REPO/releases/tags/$VERSION"
echo "Release API URL: $RELEASE_URL"

if ! curl -s "$RELEASE_URL" | grep -q '"id"'; then
    echo "ERROR: Release $VERSION does not exist"
    echo "Available releases:"
    curl -s "https://api.github.com/repos/$REPO/releases" | grep '"tag_name"' | head -10
    exit 1
fi

echo "Release $VERSION exists!"

# Check for the specific asset
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/led-dashboard-$VERSION.tar.gz"
echo "Checking download URL: $DOWNLOAD_URL"

# Test the download
echo "Testing download..."
if curl -I "$DOWNLOAD_URL" | grep -q "200 OK"; then
    echo "Download URL is accessible"
else
    echo "ERROR: Download URL is not accessible"
    echo "HTTP response:"
    curl -I "$DOWNLOAD_URL"
    exit 1
fi

# Try to download a small portion to test
echo "Testing actual download..."
if curl -L "$DOWNLOAD_URL" -o "$TMP_DIR/test.tar.gz" --range 0-1023 --fail --silent --show-error; then
    echo "Download test successful"
    
    # Check file type
    echo "File type: $(file "$TMP_DIR/test.tar.gz")"
    
    # Check if it's gzip
    if file "$TMP_DIR/test.tar.gz" | grep -q "gzip compressed data"; then
        echo "File appears to be a valid gzip archive"
    else
        echo "WARNING: File does not appear to be a gzip archive"
        echo "This might indicate the release was not created properly"
    fi
else
    echo "ERROR: Download test failed"
    exit 1
fi

echo "Test completed successfully!"
echo "The release appears to be accessible and downloadable."
