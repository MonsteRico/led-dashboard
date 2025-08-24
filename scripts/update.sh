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

# Install dependencies
cd "$INSTALL_DIR"
sudo bun install

# Restart service
sudo systemctl start dashboard.service

echo "Update complete. Now running $VERSION."
