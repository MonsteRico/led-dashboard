#!/bin/bash

echo "=========================================="
echo "Cleaning up LED Dashboard Update Services"
echo "=========================================="

# Stop any running update services
echo "Stopping any running update services..."
systemctl list-units --all | grep "update@" | awk '{print $1}' | while read service; do
    if systemctl is-active --quiet "$service"; then
        echo "Stopping $service..."
        systemctl stop "$service"
    fi
done

# Disable any update services
echo "Disabling update services..."
systemctl list-unit-files | grep "update@" | awk '{print $1}' | while read service; do
    echo "Disabling $service..."
    systemctl disable "$service"
done

# Reset failed units
echo "Resetting failed units..."
systemctl reset-failed

# Reload systemd
echo "Reloading systemd..."
systemctl daemon-reload

echo "=========================================="
echo "Cleanup completed!"
echo "=========================================="
