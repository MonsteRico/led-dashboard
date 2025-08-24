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

# Replace files
sudo rm -rf "$INSTALL_DIR/dist"
sudo cp -r "$TMP_DIR/dist" "$INSTALL_DIR/"
echo "$VERSION" | sudo tee "$INSTALL_DIR/VERSION" > /dev/null

# Restart service
sudo systemctl start dashboard.service

echo "Update complete. Now running $VERSION."
