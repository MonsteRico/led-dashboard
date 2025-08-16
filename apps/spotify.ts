import { SpotifyApi, type PlaybackState, type Track, type TrackItem } from "@spotify/web-api-ts-sdk";
import type DevMatrix from "../DevMatrix";
import App from "./app";
import { spotifyIntegration } from "@/modules/spotify/spotify-integration";
import type { Image } from "@/modules/preload/preloadImages";

export default class Spotify extends App {
    private spotify: SpotifyApi | null = null;
    private currentPlaybackState: PlaybackState | null = null;
    private currentTrack: Track | null = null;
    private isPlaying: boolean = false;
    private albumArtUrl: string | null = null;
    private albumArtImage: Image | null = null;
    private deviceId: string | null = null;
    private volume: number | null = null;

    // Volume control rate limiting
    private volumeUpdateTimeout: NodeJS.Timeout | null = null;
    private pendingVolumeUpdate: number | null = null;
    private readonly VOLUME_UPDATE_DELAY = 200; // 200ms delay between volume updates

    constructor(matrix: DevMatrix) {
        super(matrix);
        const refreshTime = 1000 * 10 * 5; // 5 minutes
        this.backgroundInterval = setInterval(() => this.backgroundUpdate(), refreshTime);
    }

    public update() {
        this.updateStateVariables();
    }

    public updateStateVariables() {
        if (this.currentPlaybackState) {
            this.currentTrack = this.currentPlaybackState.item as Track;
            this.isPlaying = this.currentPlaybackState.is_playing;
            this.albumArtUrl = this.currentTrack.album.images[0].url;
            this.deviceId = this.currentPlaybackState.device.id;
            this.volume = this.currentPlaybackState.device.volume_percent;
        }
    }

    public async onStart() {
        if (!this.spotify) {
            try {
                this.spotify = await spotifyIntegration.getApi();
            } catch (error) {
                console.error("Error initializing Spotify:", error);
            }
        }
        await this.updateCurrentPlaybackState();
        this.updateStateVariables();
        // Cancel the background update interval and replace it with one that updates every 5 seconds
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
        }
        this.backgroundInterval = setInterval(() => this.backgroundUpdate(), 1000 * 5);
    }

    public onStop() {
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
        }

        // Clear any pending volume updates
        if (this.volumeUpdateTimeout) {
            clearTimeout(this.volumeUpdateTimeout);
            this.volumeUpdateTimeout = null;
        }
        this.pendingVolumeUpdate = null;

        const refreshTime = 1000 * 10 * 5; // 5 minutes
        this.backgroundInterval = setInterval(() => this.backgroundUpdate(), refreshTime);
    }

    public async updateCurrentPlaybackState() {
        if (this.spotify) {
            try {
                const currentPlaybackState = await this.spotify.player.getPlaybackState();
                this.currentPlaybackState = currentPlaybackState;
            } catch (error) {
                console.error("Error getting playback state:", error);
                // If we get an error, try to reinitialize the API
                try {
                    this.spotify = await spotifyIntegration.getApi();
                } catch (reinitError) {
                    console.error("Error reinitializing Spotify API:", reinitError);
                }
            }
        } else {
            console.log("Spotify not authenticated. Please login via the web interface.");
        }
    }

    public backgroundUpdate() {
        this.updateCurrentPlaybackState();
        this.updateStateVariables();
        console.log({
            currentTrack: this.currentTrack,
            isPlaying: this.isPlaying,
            albumArtUrl: this.albumArtUrl,
            deviceId: this.deviceId,
            volume: this.volume,
        });
    }

    public async initialize() {
        try {
            this.spotify = await spotifyIntegration.getApi();
        } catch (error) {
            console.error("Error initializing Spotify:", error);
        }
    }

    public async handleDoublePress() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }

        // Ensure we have a valid Spotify API instance
        if (!(await this.ensureValidSpotifyApi())) {
            console.log("Cannot perform action - Spotify API not available");
            return;
        }

        try {
            console.log("Skipping to next track...");
            const skipResult = await this.spotify?.player.skipToNext(this.deviceId);
            console.log("Skip result:", skipResult);

            if (!this.isPlaying) {
                console.log("Starting playback...");
                const playResult = await this.spotify?.player.startResumePlayback(this.deviceId);
                console.log("Play result:", playResult);
            }
        } catch (error) {
            console.error("Error in handleDoublePress:", error);
            // Log additional error details
            if (error instanceof Error) {
                console.error("Error message:", error.message);
                console.error("Error stack:", error.stack);
            }
            // Try to reinitialize the API if we get a JSON parse error
            if (error instanceof SyntaxError && error.message.includes("JSON")) {
                console.log("JSON parse error detected, attempting to reinitialize API...");
                this.spotify = null; // Clear the invalid instance
                try {
                    this.spotify = await spotifyIntegration.getApi();
                } catch (reinitError) {
                    console.error("Error reinitializing Spotify API:", reinitError);
                }
            }
        }
    }

    public async handleTriplePress() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }

        // Ensure we have a valid Spotify API instance
        if (!(await this.ensureValidSpotifyApi())) {
            console.log("Cannot perform action - Spotify API not available");
            return;
        }

        try {
            console.log("Skipping to previous track...");
            const result = await this.spotify?.player.skipToPrevious(this.deviceId);
            console.log("Skip previous result:", result);
        } catch (error) {
            console.error("Error in handleTriplePress:", error);
            if (error instanceof Error) {
                console.error("Error message:", error.message);
                console.error("Error stack:", error.stack);
            }
            if (error instanceof SyntaxError && error.message.includes("JSON")) {
                console.log("JSON parse error detected, attempting to reinitialize API...");
                this.spotify = null; // Clear the invalid instance
                try {
                    this.spotify = await spotifyIntegration.getApi();
                } catch (reinitError) {
                    console.error("Error reinitializing Spotify API:", reinitError);
                }
            }
        }
    }

    public handleLongPress() {
        this.toggleOverrideDefaultPress();
    }

    public async handlePress() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }

        // Ensure we have a valid Spotify API instance
        if (!(await this.ensureValidSpotifyApi())) {
            console.log("Cannot perform action - Spotify API not available");
            return;
        }

        try {
            if (this.isPlaying) {
                console.log("Pausing playback...");
                const result = await this.spotify?.player.pausePlayback(this.deviceId);
                console.log("Pause result:", result);
            } else {
                console.log("Starting playback...");
                const result = await this.spotify?.player.startResumePlayback(this.deviceId);
                console.log("Play result:", result);
            }
        } catch (error) {
            console.error("Error in handlePress:", error);
            if (error instanceof Error) {
                console.error("Error message:", error.message);
                console.error("Error stack:", error.stack);
            }
            if (error instanceof SyntaxError && error.message.includes("JSON")) {
                console.log("JSON parse error detected, attempting to reinitialize API...");
                this.spotify = null; // Clear the invalid instance
                try {
                    this.spotify = await spotifyIntegration.getApi();
                } catch (reinitError) {
                    console.error("Error reinitializing Spotify API:", reinitError);
                }
            }
        }
    }

    public async handleRotateRight() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        if (this.volume !== null) {
            await this.setVolumeWithRateLimit(this.volume + 1);
        }
    }

    public async handleRotateLeft() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        if (this.volume !== null) {
            await this.setVolumeWithRateLimit(this.volume - 1);
        }
    }

    private async setVolumeWithRateLimit(newVolume: number) {
        if (!this.deviceId || !this.spotify) {
            console.log("No device ID or Spotify API available");
            return;
        }

        // Clamp volume to valid range (0-100)
        const clampedVolume = Math.max(0, Math.min(100, newVolume));

        // Store the pending volume update
        this.pendingVolumeUpdate = clampedVolume;

        // Clear any existing timeout
        if (this.volumeUpdateTimeout) {
            clearTimeout(this.volumeUpdateTimeout);
        }

        // Set a new timeout to execute the volume update
        this.volumeUpdateTimeout = setTimeout(async () => {
            if (this.pendingVolumeUpdate !== null) {
                try {
                    await this.spotify?.player.setPlaybackVolume(this.pendingVolumeUpdate, this.deviceId!);
                    console.log(`Volume set to: ${this.pendingVolumeUpdate}%`);
                } catch (error) {
                    console.error("Error setting volume:", error);
                }
                this.pendingVolumeUpdate = null;
            }
        }, this.VOLUME_UPDATE_DELAY);
    }

    // Method for immediate volume updates (bypasses rate limiting)
    public async setVolumeImmediate(newVolume: number) {
        if (!this.deviceId || !this.spotify) {
            console.log("No device ID or Spotify API available");
            return;
        }

        // Clear any pending rate-limited updates
        if (this.volumeUpdateTimeout) {
            clearTimeout(this.volumeUpdateTimeout);
            this.volumeUpdateTimeout = null;
        }
        this.pendingVolumeUpdate = null;

        // Clamp volume to valid range (0-100)
        const clampedVolume = Math.max(0, Math.min(100, newVolume));

        try {
            await this.spotify.player.setPlaybackVolume(clampedVolume, this.deviceId);
            console.log(`Volume set immediately to: ${clampedVolume}%`);
        } catch (error) {
            console.error("Error setting volume immediately:", error);
        }
    }

    // Helper method to validate and reinitialize Spotify API if needed
    private async ensureValidSpotifyApi(): Promise<boolean> {
        if (!this.spotify) {
            console.log("No Spotify API instance, attempting to initialize...");
            try {
                this.spotify = await spotifyIntegration.getApi();
                if (!this.spotify) {
                    console.log("Failed to initialize Spotify API");
                    return false;
                }
            } catch (error) {
                console.error("Error initializing Spotify API:", error);
                return false;
            }
        }
        return true;
    }
}
