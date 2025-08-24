#!/bin/bash
set -e

REPO_DIR=$(pwd)
INSTALL_DIR="/opt/led-dashboard"

echo "[1/8] Checking and installing dependencies..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a package is installed
package_installed() {
    dpkg -l "$1" >/dev/null 2>&1
}

# Check and install individual packages
echo "Checking hostapd..."
if ! package_installed hostapd; then
    echo "Installing hostapd..."
    sudo apt-get install -y hostapd
else
    echo "hostapd already installed"
fi

echo "Checking dnsmasq..."
if ! package_installed dnsmasq; then
    echo "Installing dnsmasq..."
    sudo apt-get install -y dnsmasq
else
    echo "dnsmasq already installed"
fi

echo "Checking git..."
if ! command_exists git; then
    echo "Installing git..."
    sudo apt-get install -y git
else
    echo "git already installed"
fi

echo "Checking curl..."
if ! command_exists curl; then
    echo "Installing curl..."
    sudo apt-get install -y curl
else
    echo "curl already installed"
fi

echo "Checking unzip..."
if ! command_exists unzip; then
    echo "Installing unzip..."
    sudo apt-get install -y unzip
else
    echo "unzip already installed"
fi

echo "Checking gcc and g++..."
if ! command_exists gcc || ! command_exists g++; then
    echo "Installing build-essential (for gcc/g++)..."
    sudo apt-get install -y build-essential
else
    echo "gcc and g++ already available"
fi

echo "Checking openssl..."
if ! command_exists openssl; then
    echo "Installing openssl..."
    sudo apt-get install -y openssl
else
    echo "openssl already installed"
fi

echo "Checking iw dev..."
if ! command_exists iw || ! iw dev >/dev/null 2>&1; then
    echo "Installing iw..."
    sudo apt-get install -y iw
else
    echo "iw dev already available"
fi

echo "[2/8] Checking and installing Bun..."

# Check if Bun is already installed for current user
if ! command_exists bun; then
    echo "Installing Bun for current user..."
    curl -fsSL https://bun.sh/install | bash
    # Add Bun to PATH for current user
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
else
    echo "Bun already installed for current user"
fi

# Check if Bun is already installed for root user
if ! sudo bun --version >/dev/null 2>&1; then
    echo "Installing Bun for root user..."
    sudo curl -fsSL https://bun.sh/install | sudo bash
    # Add Bun to PATH for root user
    sudo bash -c 'echo "export BUN_INSTALL=\"/root/.bun\"" >> /root/.bashrc'
    sudo bash -c 'echo "export PATH=\"/root/.bun/bin:\$PATH\"" >> /root/.bashrc'
else
    echo "Bun already installed for root user"
fi

# Create symlink to Bun in /usr/bin for systemd service
echo "Creating symlink to Bun in /usr/bin..."
if [ -f "/root/.bun/bin/bun" ]; then
    sudo ln -sf /root/.bun/bin/bun /usr/bin/bun
    echo "Symlink created: /usr/bin/bun -> /root/.bun/bin/bun"
elif [ -f "$HOME/.bun/bin/bun" ]; then
    sudo ln -sf "$HOME/.bun/bin/bun" /usr/bin/bun
    echo "Symlink created: /usr/bin/bun -> $HOME/.bun/bin/bun"
else
    echo "ERROR: Could not find Bun binary to create symlink"
    exit 1
fi

# Source the updated profile for current user
source ~/.bashrc

echo "[2.5/8] Running local build..."
./scripts/build.sh

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
sudo cp systemdServices/dashboard.service /etc/systemd/system/
sudo cp systemdServices/wifi-check.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dashboard.service
sudo systemctl enable wifi-check.service

echo "[7/8] Installing network configs..."
sudo cp systemConfigs/hostapd.conf /etc/hostapd/hostapd.conf
sudo cp systemConfigs/dnsmasq.conf /etc/dnsmasq.conf
sudo cp systemConfigs/dhcpcd.conf /etc/dhcpcd.conf

echo "[8/8] Setup complete."
echo "SSL certificates have been generated and installed to $INSTALL_DIR/ssl/"
echo "Bun has been installed for both current user and root user."
echo "Reboot recommended."
