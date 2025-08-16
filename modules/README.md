# LED Dashboard Modules

This directory contains modular components for the LED Dashboard.

## Module System

The dashboard uses a modular architecture where services and APIs are organized into modules that provide easy access to external services.

### Module Structure:

- `weather/`: Weather API and services
- `spotify/`: Spotify API and authentication
- `webconfig/`: Web configuration interface

### Module Pattern:

Each module is a singleton class that:

- Provides easy access to an API or service
- Can be configured with settings
- May include initialization methods
- Is accessible globally to all apps

### Adding New Modules:

1. Create your module service (e.g., `modules/yourmodule/yourmodule-service.ts`)
2. Initialize it in `index.ts` before apps are registered
3. Import and use it in any app

```typescript
// In index.ts
await yourModuleService.initialize();

// In any app
import { yourModuleService } from "@/modules/yourmodule/yourmodule-service";
```

## Weather Module (`modules/weather/`)

The weather module provides weather data services using the Open-Meteo API.

### Features:

- Weather data fetching with caching
- Automatic data refresh
- Weather code to icon mapping
- Configurable location and refresh intervals
- Singleton service pattern for global access

### Files:

- `weather-service.ts`: Main weather service with API integration

### Usage:

```typescript
import { weatherService } from "@/modules/weather/weather-service";

// Get current weather data
const weatherData = await weatherService.getWeatherData();

// Get weather icon for a weather code
const icon = weatherService.getWeatherCodeIcon(weatherCode, isDay);

// Configure weather service
weatherService.configure({
    latitude: 39.9835,
    longitude: -86.0455,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
});
```

### Configuration:

The weather module is automatically initialized with default settings:

- Location: Indianapolis (39.9835, -86.0455)
- Refresh interval: 5 minutes
- Temperature unit: Fahrenheit

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
