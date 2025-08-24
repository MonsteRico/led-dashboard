# Spotify Module

This module handles Spotify authentication and API interactions for the LED Dashboard.

## Setup

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Note your `Client ID` and `Client Secret`

### 2. Configure Redirect URI

**Important**: The redirect URI must match exactly what you configure in Spotify.

#### For Local Development (same device):

**HTTP:**

```
http://127.0.0.1:3000/api/spotify/callback
```

**HTTPS (recommended for Spotify):**

```
https://127.0.0.1:3000/api/spotify/callback
```

#### For Network Access (from other devices):

You need to use your Raspberry Pi's actual IP address. To find it:

```bash
# On the Raspberry Pi, run:
hostname -I
# or
ip addr show
```

Then use the IP address in your redirect URI:

**HTTP:**

```
http://YOUR_PI_IP_ADDRESS:3000/api/spotify/callback
```

**HTTPS (recommended for Spotify):**

```
https://YOUR_PI_IP_ADDRESS:3000/api/spotify/callback
```

**Example**: If your Pi's IP is `192.168.1.100`:

```
https://192.168.1.100:3000/api/spotify/callback
```

### 3. Environment Variables

Set these environment variables on your Raspberry Pi:

```bash
export SPOTIFY_CLIENT_ID="your_spotify_client_id_here"
export SPOTIFY_CLIENT_SECRET="your_spotify_client_secret_here"
export SPOTIFY_REDIRECT_URI="https://YOUR_PI_IP_ADDRESS:3000/api/spotify/callback"
```

**Note**: For HTTPS setup, see `HTTPS_SETUP.md` for complete instructions.

### 4. Spotify App Configuration

In your Spotify Developer Dashboard:

1. Go to your app settings
2. Add the redirect URI to the "Redirect URIs" list
3. Save the changes

## Usage

Once configured, users can:

1. Access the web interface at `http://YOUR_PI_IP_ADDRESS:3000`
2. Click "Login to Spotify"
3. Complete the OAuth flow
4. Use Spotify features in the dashboard

## Troubleshooting

### "Invalid redirect URI" Error

- Make sure the redirect URI in your Spotify app settings exactly matches your environment variable
- Check that you're using the correct IP address
- Ensure the port (3000) is correct

### "Connection refused" Error

- Make sure the web server is running on the Raspberry Pi
- Check that port 3000 is accessible from your network
- Verify firewall settings allow incoming connections on port 3000

### Finding Your Pi's IP Address

If you're not sure of your Pi's IP address:

```bash
# Method 1: Using hostname
hostname -I

# Method 2: Using ip command
ip addr show | grep "inet "

# Method 3: Using ifconfig (if available)
ifconfig | grep "inet "
```

## Security Notes

- Keep your `SPOTIFY_CLIENT_SECRET` secure and never commit it to version control
- The redirect URI should be HTTPS in production environments
- Consider using environment-specific redirect URIs for development vs production
