import { SpotifyApi } from "@spotify/web-api-ts-sdk";

export interface SpotifyTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    expires_at: number;
}

export class SpotifyAuth {
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;
    private tokens: SpotifyTokens | null = null;
    private spotifyApi: SpotifyApi | null = null;

    constructor() {
        this.clientId = process.env.SPOTIFY_CLIENT_ID || "";
        this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";

        // Determine protocol based on HTTPS setting
        const protocol = process.env.USE_HTTPS === "true" ? "https" : "http";

        // Use the Raspberry Pi's IP address for the redirect URI
        // This allows users to authenticate from other devices on the network
        // Default to 0.0.0.0 which will work for local access, but should be set to actual IP for network access
        this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${protocol}://0.0.0.0:3000/api/spotify/callback`;
    }

    private checkCredentials(): void {
        if (!this.clientId || !this.clientSecret) {
            throw new Error(
                "Spotify credentials not found in environment variables. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
            );
        }
    }

    public getAuthUrl(): string {
        this.checkCredentials();
        const scopes = [
            "user-read-private",
            "user-read-email",
            "user-read-playback-state",
            "user-modify-playback-state",
            "user-read-currently-playing",
            "user-read-recently-played",
            "user-read-playback-position",
            "user-top-read",
        ];

        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: "code",
            redirect_uri: this.redirectUri,
            scope: scopes.join(" "),
            state: this.generateState(),
        });

        return `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    public async handleCallback(code: string, state: string): Promise<SpotifyTokens> {
        this.checkCredentials();
        // Verify state parameter (in a real app, you'd store this in session)
        // For now, we'll skip state verification for simplicity

        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: this.redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            throw new Error(`Failed to get access token: ${tokenResponse.statusText}`);
        }

        const tokenData = await tokenResponse.json();

        this.tokens = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type,
            scope: tokenData.scope,
            expires_at: Date.now() + tokenData.expires_in * 1000,
        };

        await this.saveTokens();
        this.initializeApi();

        return this.tokens;
    }

    public async refreshTokens(): Promise<SpotifyTokens> {
        this.checkCredentials();
        if (!this.tokens?.refresh_token) {
            throw new Error("No refresh token available");
        }

        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: this.tokens.refresh_token,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Failed to refresh token: ${tokenResponse.statusText} - ${errorText}`);
        }

        const tokenData = await tokenResponse.json();

        this.tokens = {
            ...this.tokens,
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in,
            expires_at: Date.now() + tokenData.expires_in * 1000,
        };

        // Update refresh token if provided
        if (tokenData.refresh_token) {
            this.tokens.refresh_token = tokenData.refresh_token;
        }

        await this.saveTokens();
        this.initializeApi();

        return this.tokens;
    }

    public async loadTokens(): Promise<SpotifyTokens | null> {
        if (this.tokens) {
            return this.tokens;
        }

        try {
            const file = Bun.file("spotify-tokens.json");
            if (await file.exists()) {
                const data = await file.text();
                try {
                    this.tokens = JSON.parse(data);
                } catch (parseError) {
                    console.error("Error parsing tokens JSON:", parseError);
                    console.log("Invalid token file detected. Please delete spotify-tokens.json manually and re-authenticate.");
                    return null;
                }

                // Check if token is expired
                if (this.tokens && Date.now() >= this.tokens.expires_at) {
                    console.log("Token expired, attempting to refresh...");
                    this.refreshTokens().catch((error) => {
                        console.error("Failed to refresh token:", error);
                        this.tokens = null;
                    });
                } else {
                    this.initializeApi();
                }

                return this.tokens;
            }
        } catch (error) {
            console.error("Error loading tokens:", error);
        }

        return null;
    }

    private async saveTokens(): Promise<void> {
        if (this.tokens) {
            try {
                await Bun.write("spotify-tokens.json", JSON.stringify(this.tokens, null, 2));
            } catch (error) {
                console.error("Error saving tokens:", error);
            }
        }
    }

    private initializeApi(): void {
        if (this.tokens) {
            this.spotifyApi = SpotifyApi.withAccessToken(this.clientId, {
                access_token: this.tokens.access_token,
                token_type: this.tokens.token_type,
                expires_in: this.tokens.expires_in,
                refresh_token: this.tokens.refresh_token,
            });
        }
    }

    public async getApi(): Promise<SpotifyApi | null> {
        try {
            if (!this.spotifyApi) {
                await this.loadTokens();
            }

            // Check if tokens are still valid
            if (this.tokens && Date.now() >= this.tokens.expires_at) {
                await this.refreshTokens();
            }

            return this.spotifyApi;
        } catch (error) {
            console.error("Error getting Spotify API:", error);
            return null;
        }
    }

    public isAuthenticated(): boolean {
        return this.tokens !== null && this.spotifyApi !== null;
    }

    private generateState(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}
