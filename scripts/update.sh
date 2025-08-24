#!/bin/bash
set -e
REPO="MonsteRico/led-dashboard"

# Get latest release
LATEST_VERSION=$(curl -s https://api.github.com/repos/$REPO/releases/latest \
  | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

# Download build artifact
cd /home/pi
curl -L -o led-dashboard-update.tar.gz \
  https://github.com/$REPO/releases/download/$LATEST_VERSION/led-dashboard-$LATEST_VERSION.tar.gz

# Backup old version
mv led-dashboard led-dashboard-backup-$(date +%s)

# Extract new one
tar -xzf led-dashboard-update.tar.gz
mv led-dashboard-$LATEST_VERSION led-dashboard

# Update version file
echo "$LATEST_VERSION" > /home/pi/led-dashboard/VERSION

# Restart dashboard
sudo systemctl restart dashboard.service

echo "Updated to $LATEST_VERSION"
