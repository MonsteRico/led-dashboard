import { SpotifyAuth } from "./spotify-auth";
import { SpotifyApi, type PlaybackState } from "@spotify/web-api-ts-sdk";

class SpotifyIntegration {
    private auth: SpotifyAuth;

    constructor() {
        this.auth = new SpotifyAuth();
    }

    public getAuthUrl(): string {
        return this.auth.getAuthUrl();
    }

    public async handleCallback(code: string, state: string) {
        return await this.auth.handleCallback(code, state);
    }

    public isAuthenticated(): boolean {
        return this.auth.isAuthenticated();
    }

    public getApi(): SpotifyApi | null {
        return this.auth.getApi();
    }
}

export type { SpotifyIntegration };

export const spotifyIntegration = new SpotifyIntegration();
