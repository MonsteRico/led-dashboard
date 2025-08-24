#!/bin/bash
# This script is used to check if the Wi-Fi is working. If not, it will start the AP mode.
# This script should be placed in /usr/local/bin/wifi-check.sh
# It should be executable: chmod +x /usr/local/bin/wifi-check.sh

SSID="Dashboard-$(cat /sys/class/net/wlan0/address | tr -d ':' | tail -c 4)"

# Check if internet is up
if ping -c1 8.8.8.8 &>/dev/null; then
  echo "Wi-Fi working, skipping AP mode."
else
  echo "No Wi-Fi, starting AP mode..."
  # Replace SSID dynamically in hostapd config
  sed -i "s/^ssid=.*/ssid=$SSID/" /etc/hostapd/hostapd.conf

  systemctl start hostapd
  systemctl start dnsmasq
fi
