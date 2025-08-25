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

echo "Checking python3..."
if ! command_exists python3; then
    echo "Installing python3..."
    sudo apt-get install -y python3
else
    echo "python3 already installed"
fi

echo "Checking make..."
if ! command_exists make; then
    echo "Installing make..."
    sudo apt-get install -y make
else
    echo "make already available"
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
echo "Checking if Bun symlink is needed in /usr/bin..."

# Skip if /usr/bin/bun already exists
if [ -e "/usr/bin/bun" ]; then
    echo "Bun already exists at /usr/bin/bun, skipping symlink creation"
    echo "Bun version: $(/usr/bin/bun --version)"
else
    echo "Creating symlink to Bun in /usr/bin..."
    BUN_PATH=""

    # Check multiple possible locations for Bun
    if [ -f "/root/.bun/bin/bun" ]; then
        BUN_PATH="/root/.bun/bin/bun"
        echo "Found Bun at: $BUN_PATH"
    elif [ -f "$HOME/.bun/bin/bun" ]; then
        BUN_PATH="$HOME/.bun/bin/bun"
        echo "Found Bun at: $BUN_PATH"
    elif command_exists bun; then
        BUN_PATH=$(which bun)
        echo "Found Bun in PATH at: $BUN_PATH"
    else
        echo "ERROR: Could not find Bun binary to create symlink"
        echo "Expected locations:"
        echo "  - /root/.bun/bin/bun"
        echo "  - $HOME/.bun/bin/bun"
        echo "  - In PATH"
        exit 1
    fi

    # Create the symlink
    sudo ln -sf "$BUN_PATH" /usr/bin/bun
    echo "Symlink created: /usr/bin/bun -> $BUN_PATH"

    # Verify the symlink works
    if [ -L "/usr/bin/bun" ] && [ -e "/usr/bin/bun" ]; then
        echo "Symlink verified successfully"
        echo "Bun version: $(/usr/bin/bun --version)"
    else
        echo "ERROR: Failed to create working symlink"
        exit 1
    fi
fi

# Source the updated profile for current user
source ~/.bashrc

echo "[3/8] Installing node-gyp globally..."
# Install node-gyp globally for native module compilation
sudo bun install -g node-gyp

echo "[4/8] Creating install dir and copying source files..."
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r src "$INSTALL_DIR/"
sudo cp package.json "$INSTALL_DIR/"
sudo cp tsconfig.json "$INSTALL_DIR/"
sudo cp bun.lock "$INSTALL_DIR/"
sudo cp VERSION "$INSTALL_DIR/"
sudo cp -r scripts "$INSTALL_DIR/"

# Ensure all files are owned by root since the service runs as root
sudo chown -R root:root "$INSTALL_DIR"

# Make scripts executable
sudo chmod +x "$INSTALL_DIR/scripts"/*

echo "[5/8] Installing dependencies in install directory..."
cd "$INSTALL_DIR"
sudo bun install

echo "[5.5/8] Compiling native modules..."
# Ensure native modules are properly compiled for the current platform
echo "Compiling rpi-led-matrix..."
cd node_modules/rpi-led-matrix
if [ -f "binding.gyp" ]; then
    sudo bun run node-gyp rebuild
else
    echo "No binding.gyp found in rpi-led-matrix, skipping compilation"
fi
cd ../..

echo "Compiling sharp..."
cd node_modules/sharp
if [ -f "binding.gyp" ]; then
    sudo bun run node-gyp rebuild
else
    echo "No binding.gyp found in sharp, skipping compilation"
fi
cd ../..

echo "Native module compilation completed"

echo "[7/8] Generating SSL certificates..."
# Run the SSL certificate generation script
cd "$REPO_DIR"
./scripts/generate-ssl-certs.sh
# Copy SSL certificates to install directory
sudo mkdir -p "$INSTALL_DIR/ssl"
sudo cp ssl/* "$INSTALL_DIR/ssl/"
sudo chown -R root:root "$INSTALL_DIR/ssl"
sudo chmod 600 "$INSTALL_DIR/ssl/private-key.pem"
sudo chmod 644 "$INSTALL_DIR/ssl/certificate.pem"

echo "[8/8] Installing scripts..."
sudo cp scripts/check-for-updates.sh /usr/local/bin/check-for-updates.sh
sudo cp scripts/update.sh /usr/local/bin/update.sh
sudo cp scripts/update-direct.sh /usr/local/bin/update-direct.sh
sudo cp scripts/wifi-check.sh /usr/local/bin/wifi-check.sh
sudo chmod +x /usr/local/bin/*

echo "[9/8] Installing services..."
sudo cp systemdServices/dashboard.service /etc/systemd/system/
sudo cp systemdServices/wifi-check.service /etc/systemd/system/
sudo cp systemdServices/update.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dashboard.service
sudo systemctl enable wifi-check.service

echo "[10/8] Installing network configs..."
sudo cp systemConfigs/hostapd.conf /etc/hostapd/hostapd.conf
sudo cp systemConfigs/dnsmasq.conf /etc/dnsmasq.conf
sudo cp systemConfigs/dhcpcd.conf /etc/dhcpcd.conf

echo "Setup complete."
echo "SSL certificates have been generated and installed to $INSTALL_DIR/ssl/"
echo "Bun has been installed for both current user and root user."
echo "Source files have been copied to $INSTALL_DIR/"
echo "Dependencies have been installed using bun install."
echo "Build tools (gcc, g++, make, python3) and node-gyp have been installed for native module compilation."
echo "Reboot recommended."
