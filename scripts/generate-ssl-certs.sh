#!/bin/bash

# Script to generate self-signed SSL certificates for the LED Dashboard HTTPS server

echo "Generating self-signed SSL certificates for HTTPS server..."
echo ""

# Create certificates directory if it doesn't exist
mkdir -p ssl

# Get the Raspberry Pi's IP address
PI_IP=$(hostname -I | awk '{print $1}')
echo "Detected Pi IP: $PI_IP"

# Generate private key
echo "Generating private key..."
openssl genrsa -out ssl/private-key.pem 2048

# Generate certificate signing request (CSR)
echo "Generating certificate signing request..."
openssl req -new -key ssl/private-key.pem -out ssl/certificate.csr -subj "/C=US/ST=Indiana/L=Indianapolis/O=LED Dashboard/CN=$PI_IP"

# Generate self-signed certificate
echo "Generating self-signed certificate..."
openssl x509 -req -in ssl/certificate.csr -signkey ssl/private-key.pem -out ssl/certificate.pem -days 365

# Set proper permissions
chmod 600 ssl/private-key.pem
chmod 644 ssl/certificate.pem

# Clean up CSR file
rm ssl/certificate.csr

echo ""
echo "✅ SSL certificates generated successfully!"
echo ""
echo "Certificate files created:"
echo "  - ssl/private-key.pem (private key)"
echo "  - ssl/certificate.pem (certificate)"
echo ""
echo "Your server can now run on HTTPS:"
echo "  https://$PI_IP:3000"
echo ""
echo "⚠️  Note: Since this is a self-signed certificate, browsers will show a security warning."
echo "   You'll need to accept the certificate in your browser to proceed."
echo ""
echo "To accept the certificate:"
echo "1. Visit https://$PI_IP:3000 in your browser"
echo "2. Click 'Advanced' or 'Show Details'"
echo "3. Click 'Proceed to $PI_IP (unsafe)' or similar"
echo "4. The certificate will be accepted for future visits"
