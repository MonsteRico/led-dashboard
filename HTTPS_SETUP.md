# HTTPS Setup Guide for LED Dashboard

This guide will help you set up HTTPS with self-signed certificates for your LED Dashboard, which is required for Spotify API integration.

## Prerequisites

- OpenSSL installed on your Raspberry Pi
- Root/sudo access to generate certificates

## Step 1: Generate SSL Certificates

Run the certificate generation script:

```bash
./scripts/generate-ssl-certs.sh
```

This will:

- Create an `ssl/` directory
- Generate a private key (`ssl/private-key.pem`)
- Generate a self-signed certificate (`ssl/certificate.pem`)
- Set proper file permissions

## Step 2: Configure Environment Variables

Set the following environment variables to enable HTTPS:

```bash
# Enable HTTPS
export USE_HTTPS="true"

# Optional: Specify custom certificate paths (defaults to ssl/certificate.pem and ssl/private-key.pem)
export SSL_CERT_PATH="ssl/certificate.pem"
export SSL_KEY_PATH="ssl/private-key.pem"

# Update Spotify redirect URI to use HTTPS
export SPOTIFY_REDIRECT_URI="https://YOUR_PI_IP_ADDRESS:3000/api/spotify/callback"
```

## Step 3: Update Spotify App Settings

In your Spotify Developer Dashboard:

1. Go to your app settings
2. Add the HTTPS redirect URI:
    ```
    https://YOUR_PI_IP_ADDRESS:3000/api/spotify/callback
    ```
3. Save the changes

## Step 4: Start the Server

Start your LED Dashboard as usual:

```bash
bun run index.ts
```

You should see output like:

```
Starting HTTPS server on port 3000
HTTPS enabled with certificates:
  Certificate: ssl/certificate.pem
  Private Key: ssl/private-key.pem
```

## Step 5: Access the Web Interface

Visit your dashboard at:

```
https://YOUR_PI_IP_ADDRESS:3000
```

## Browser Security Warning

Since you're using a self-signed certificate, browsers will show a security warning. To proceed:

### Chrome/Edge:

1. Click "Advanced"
2. Click "Proceed to YOUR_PI_IP_ADDRESS (unsafe)"

### Firefox:

1. Click "Advanced"
2. Click "Accept the Risk and Continue"

### Safari:

1. Click "Show Details"
2. Click "visit this website"
3. Click "Visit Website" in the popup

## Troubleshooting

### Certificate Not Found

```
Failed to load SSL certificates: Error: ENOENT: no such file or directory
```

**Solution:** Make sure you've run the certificate generation script and the files exist in the `ssl/` directory.

### Permission Denied

```
Failed to load SSL certificates: Error: EACCES: permission denied
```

**Solution:** Check file permissions:

```bash
ls -la ssl/
# Should show: -rw------- for private-key.pem and -rw-r--r-- for certificate.pem
```

### Spotify Redirect URI Error

If you get "Invalid redirect URI" errors from Spotify:

1. Make sure your Spotify app settings include the HTTPS URI
2. Verify the IP address is correct
3. Check that the URI exactly matches your environment variable

### Certificate Expired

Self-signed certificates expire after 365 days. To renew:

```bash
# Remove old certificates
rm ssl/certificate.pem ssl/private-key.pem

# Generate new ones
./scripts/generate-ssl-certs.sh
```

## Security Notes

- Self-signed certificates are suitable for local/private networks
- For production use, consider using Let's Encrypt for free, trusted certificates
- Keep your private key secure and never share it
- The certificate is valid for 365 days and will need to be renewed

## Environment Variables Summary

```bash
# Required for HTTPS
export USE_HTTPS="true"

# Spotify configuration (update with your actual values)
export SPOTIFY_CLIENT_ID="your_client_id"
export SPOTIFY_CLIENT_SECRET="your_client_secret"
export SPOTIFY_REDIRECT_URI="https://YOUR_PI_IP_ADDRESS:3000/api/spotify/callback"

# Optional: Custom certificate paths
export SSL_CERT_PATH="ssl/certificate.pem"
export SSL_KEY_PATH="ssl/private-key.pem"
```

## Testing HTTPS

To verify HTTPS is working:

```bash
# Test with curl (ignore certificate warnings)
curl -k https://YOUR_PI_IP_ADDRESS:3000

# Test with openssl
openssl s_client -connect YOUR_PI_IP_ADDRESS:3000 -servername YOUR_PI_IP_ADDRESS
```

Your LED Dashboard is now running securely with HTTPS! 🎉
