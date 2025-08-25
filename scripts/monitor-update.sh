#!/bin/bash

if [[ -z "$1" ]]; then
    echo "Usage: monitor-update.sh <version>"
    echo "Example: monitor-update.sh v0.0.5"
    exit 1
fi

VERSION="$1"
SERVICE_NAME="update@${VERSION}.service"

echo "=========================================="
echo "Monitoring LED Dashboard Update: $VERSION"
echo "=========================================="

echo "Checking if update service exists..."
if systemctl list-unit-files | grep -q "$SERVICE_NAME"; then
    echo "✓ Update service exists"
else
    echo "✗ Update service not found"
    exit 1
fi

echo "Checking update service status..."
systemctl status "$SERVICE_NAME" --no-pager

echo ""
echo "Following update logs (press Ctrl+C to stop)..."
echo "=========================================="

# Follow the journal for the update service
journalctl -u "$SERVICE_NAME" -f
