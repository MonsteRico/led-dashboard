#!/bin/bash

# Script to find the Raspberry Pi's IP address for Spotify configuration

echo "Finding your Raspberry Pi's IP address..."
echo ""

# Method 1: Using hostname
echo "Method 1 - Using hostname:"
hostname -I
echo ""

# Method 2: Using ip command
echo "Method 2 - Using ip command:"
ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | cut -d'/' -f1
echo ""

# Method 3: Using ifconfig (if available)
if command -v ifconfig &> /dev/null; then
    echo "Method 3 - Using ifconfig:"
    ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}'
    echo ""
fi

echo "Use one of these IP addresses in your Spotify redirect URI:"
echo "http://YOUR_PI_IP_ADDRESS:3000/api/spotify/callback"
echo ""
echo "Example:"
echo "export SPOTIFY_REDIRECT_URI=\"http://192.168.1.100:3000/api/spotify/callback\""
echo ""
echo "Don't forget to also add this URI to your Spotify app settings in the developer dashboard!"
