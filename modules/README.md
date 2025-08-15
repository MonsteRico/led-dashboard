# LED Dashboard Modules

This directory contains modular components for the LED Dashboard.

## WebConfig Module (`modules/webconfig/`)

The web configuration module provides a web interface for managing the dashboard configuration.

### Features:

- Web server running on port 3000 (configurable)
- Toggle apps on/off through a web interface
- Save configuration to `config.json`
- Reset current app to 0 when configuration changes
- Global configuration management accessible from anywhere in the app

### Structure:

- `config-manager.ts`: Global singleton for configuration management
- `app-registry.ts`: App registry system for centralized app management
- `server.ts`: Web server with static file serving
- `templates/`: Static web files
    - `index.html`: Main web interface
    - `styles.css`: CSS styles
    - `script.js`: JavaScript functionality

### Usage:

The web server starts automatically when the main application runs. Access it at `http://127.0.0.1:3000`

### Adding New Apps:

To add a new app, simply add it to the `registerAllApps()` function in `apps/app-registrations.ts`:

```typescript
appRegistry.registerApp({
    name: "Your New App",
    className: "YourNewApp",
    enabled: true,
    factory: (matrix: DevMatrix) => new YourNewApp(matrix),
});
```

This is the **ONLY** place you need to define new apps. The system will automatically:

- Register the app with the configuration system
- Make it available in the web interface
- Create it when the application starts (if enabled)

## Spotify Module (`modules/spotify/`)

The Spotify module handles authentication and API interactions with Spotify.

### Features:

- OAuth 2.0 authentication flow
- Token management with automatic refresh
- Integration with the web interface for login
- Comprehensive API wrapper for Spotify Web API

### Setup:

1. Create a Spotify app at https://developer.spotify.com/dashboard
2. Set the redirect URI to `http://127.0.0.1:3000/spotify/callback`
3. Add environment variables:
    ```
    SPOTIFY_CLIENT_ID=your_spotify_client_id_here
    SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
    SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/spotify/callback
    ```

### Files:

- `spotify-auth.ts`: Handles OAuth authentication and token management
- `spotify-integration.ts`: Comprehensive API wrapper with all Spotify API functions

### Authentication Flow:

1. User clicks "Login to Spotify" in web interface
2. User is redirected to Spotify authorization page
3. User authorizes the application
4. User is redirected back to `/spotify/callback`
5. Tokens are saved to `spotify-tokens.json`
6. User can now use Spotify features in the dashboard

