#!/bin/bash
REPO="MonsteRico/led-dashboard"
LOCAL_VERSION=$(cat /home/pi/led-dashboard/VERSION 2>/dev/null || echo "none")

LATEST_VERSION=$(curl -s https://api.github.com/repos/$REPO/releases/latest \
  | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ "$LOCAL_VERSION" != "$LATEST_VERSION" ]; then
  echo "update-available:$LATEST_VERSION"
  exit 1
else
  echo "up-to-date:$LOCAL_VERSION"
  exit 0
fi
