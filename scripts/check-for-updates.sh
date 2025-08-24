#!/bin/bash
set -e

REPO="MonsteRico/led-dashboard"
INSTALL_DIR="/opt/led-dashboard"
CURRENT_VERSION_FILE="$INSTALL_DIR/VERSION"

# Get current version
if [[ -f "$CURRENT_VERSION_FILE" ]]; then
  CURRENT_VERSION=$(cat "$CURRENT_VERSION_FILE")
else
  CURRENT_VERSION="0.0.0"
fi

# Get latest version tag from GitHub API
LATEST_VERSION=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" \
  | grep -Po '"tag_name": "\K.*?(?=")' || echo "")

if [[ -z "$LATEST_VERSION" ]]; then
  echo "[ERROR] Could not fetch latest release info."
  exit 1
fi

echo "Current version: $CURRENT_VERSION"
echo "Latest version:  $LATEST_VERSION"

# Compare versions
if [[ "$CURRENT_VERSION" == "$LATEST_VERSION" ]]; then
  echo "No update needed."
  exit 0
else
  echo "Update available"
  echo "update-available:$LATEST_VERSION"
fi
