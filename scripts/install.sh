#!/bin/bash
set -e

REPO_DIR=$(pwd)
INSTALL_DIR="/opt/led-dashboard"

echo "[1/6] Installing dependencies..."
sudo apt-get update
sudo apt-get install -y hostapd dnsmasq git curl unzip

echo "[2/6] Creating install dir..."
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r dist "$INSTALL_DIR/"
sudo cp VERSION "$INSTALL_DIR/"

echo "[3/6] Installing scripts..."
sudo cp scripts/check-for-updates.sh /usr/local/bin/check-for-updates
sudo cp scripts/update.sh /usr/local/bin/update-dashboard
sudo cp scripts/wifi-check.sh /usr/local/bin/wifi-check
sudo chmod +x /usr/local/bin/*

echo "[4/6] Installing services..."
sudo cp systemd/dashboard.service /etc/systemd/system/
sudo cp systemd/wifi-check.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dashboard.service
sudo systemctl enable wifi-check.service

echo "[5/6] Installing network configs..."
sudo cp configs/hostapd.conf /etc/hostapd/hostapd.conf
sudo cp configs/dnsmasq.conf /etc/dnsmasq.conf

echo "[6/6] Setup complete."
echo "Reboot recommended."
