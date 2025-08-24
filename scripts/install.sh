#!/bin/bash
set -e

REPO_DIR=$(pwd)
INSTALL_DIR="/opt/led-dashboard"

echo "[1/8] Installing dependencies..."
sudo apt-get update
sudo apt-get install -y hostapd dnsmasq git curl unzip build-essential openssl

echo "[2/8] Installing Bun..."
# Install Bun for the current user
curl -fsSL https://bun.sh/install | bash
# Install Bun for root user (sudo)
sudo curl -fsSL https://bun.sh/install | sudo bash
# Add Bun to PATH for both users
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
sudo bash -c 'echo "export BUN_INSTALL=\"/root/.bun\"" >> /root/.bashrc'
sudo bash -c 'echo "export PATH=\"/root/.bun/bin:\$PATH\"" >> /root/.bashrc'
# Source the updated profile
source ~/.bashrc

echo "[3/8] Creating install dir..."
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r dist "$INSTALL_DIR/"
sudo cp VERSION "$INSTALL_DIR/"

echo "[4/8] Generating SSL certificates..."
# Run the SSL certificate generation script
./scripts/generate-ssl-certs.sh
# Copy SSL certificates to install directory
sudo mkdir -p "$INSTALL_DIR/ssl"
sudo cp ssl/* "$INSTALL_DIR/ssl/"
sudo chown -R root:root "$INSTALL_DIR/ssl"
sudo chmod 600 "$INSTALL_DIR/ssl/private-key.pem"
sudo chmod 644 "$INSTALL_DIR/ssl/certificate.pem"

echo "[5/8] Installing scripts..."
sudo cp scripts/check-for-updates.sh /usr/local/bin/check-for-updates.sh
sudo cp scripts/update.sh /usr/local/bin/update.sh
sudo cp scripts/wifi-check.sh /usr/local/bin/wifi-check.sh
sudo chmod +x /usr/local/bin/*

echo "[6/8] Installing services..."
sudo cp systemd/dashboard.service /etc/systemd/system/
sudo cp systemd/wifi-check.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dashboard.service
sudo systemctl enable wifi-check.service

echo "[7/8] Installing network configs..."
sudo cp configs/hostapd.conf /etc/hostapd/hostapd.conf
sudo cp configs/dnsmasq.conf /etc/dnsmasq.conf

echo "[8/8] Setup complete."
echo "SSL certificates have been generated and installed to $INSTALL_DIR/ssl/"
echo "Bun has been installed for both current user and root user."
echo "Reboot recommended."
