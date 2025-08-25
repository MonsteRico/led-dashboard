#!/bin/bash
set -e

echo "=========================================="
echo "LED Dashboard Update Debug Script"
echo "=========================================="

# Check if we're running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This script must be run as root (use sudo)"
    exit 1
fi

echo "Running as root: OK"

# Check if dashboard service exists
if ! systemctl list-unit-files | grep -q dashboard.service; then
    echo "ERROR: dashboard.service not found in systemd"
    exit 1
fi

echo "Dashboard service exists: OK"

# Check service status
echo "Current dashboard service status:"
systemctl status dashboard.service --no-pager

# Check if install directory exists
INSTALL_DIR="/opt/led-dashboard"
if [ ! -d "$INSTALL_DIR" ]; then
    echo "ERROR: Install directory $INSTALL_DIR does not exist"
    exit 1
fi

echo "Install directory exists: OK"

# Check install directory contents
echo "Install directory contents:"
ls -la "$INSTALL_DIR"

# Check if scripts directory exists
if [ ! -d "$INSTALL_DIR/scripts" ]; then
    echo "ERROR: Scripts directory does not exist"
    exit 1
fi

echo "Scripts directory exists: OK"

# Check if update script exists
if [ ! -f "$INSTALL_DIR/scripts/update-direct.sh" ]; then
    echo "ERROR: update-direct.sh script does not exist"
    exit 1
fi

echo "Update script exists: OK"

# Check script permissions
echo "Update script permissions:"
ls -la "$INSTALL_DIR/scripts/update-direct.sh"

# Test if we can stop the service
echo "Testing service stop..."
if systemctl is-active --quiet dashboard.service; then
    echo "Service is running, testing stop..."
    if systemctl stop dashboard.service; then
        echo "Service stopped successfully"
        echo "Testing service start..."
        if systemctl start dashboard.service; then
            echo "Service started successfully"
        else
            echo "ERROR: Failed to start service"
            systemctl status dashboard.service --no-pager
        fi
    else
        echo "ERROR: Failed to stop service"
        systemctl status dashboard.service --no-pager
    fi
else
    echo "Service is not running"
fi

# Check disk space
echo "Disk space:"
df -h /

# Check memory
echo "Memory usage:"
free -h

echo "=========================================="
echo "Debug check completed"
echo "=========================================="
