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
                // Handle JSON parse errors silently as they don't affect functionality
                if (error instanceof SyntaxError && error.message.includes("JSON")) {
                    // JSON parse errors are expected due to Spotify API response format issues
                    // The API calls work correctly, but the SDK has trouble parsing some responses
                    return;
                }
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

        try {
            await this.spotify?.player.skipToNext(this.deviceId);
            if (!this.isPlaying) {
                await this.spotify?.player.startResumePlayback(this.deviceId);
            }
        } catch (error) {
            // Handle JSON parse errors silently as they don't affect functionality
            if (error instanceof SyntaxError && error.message.includes("JSON")) {
                // JSON parse errors are expected due to Spotify API response format issues
                // The API calls work correctly, but the SDK has trouble parsing some responses
                return;
            }
            console.error("Error in handleDoublePress:", error);
        }
    }

    public async handleTriplePress() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }

        try {
            await this.spotify?.player.skipToPrevious(this.deviceId);
        } catch (error) {
            // Handle JSON parse errors silently as they don't affect functionality
            if (error instanceof SyntaxError && error.message.includes("JSON")) {
                // JSON parse errors are expected due to Spotify API response format issues
                // The API calls work correctly, but the SDK has trouble parsing some responses
                return;
            }
            console.error("Error in handleTriplePress:", error);
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

        try {
            if (this.isPlaying) {
                await this.spotify?.player.pausePlayback(this.deviceId);
            } else {
                await this.spotify?.player.startResumePlayback(this.deviceId);
            }
        } catch (error) {
            // Handle JSON parse errors silently as they don't affect functionality
            if (error instanceof SyntaxError && error.message.includes("JSON")) {
                // JSON parse errors are expected due to Spotify API response format issues
                // The API calls work correctly, but the SDK has trouble parsing some responses
                return;
            }
            console.error("Error in handlePress:", error);
        }
    }

    public async handleRotateRight() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        if (this.volume !== null) {
            const newVolume = Math.min(100, this.volume + 1);
            await this.spotify?.player.setPlaybackVolume(newVolume, this.deviceId);
        }
    }

    public async handleRotateLeft() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        if (this.volume !== null) {
            const newVolume = Math.max(0, this.volume - 1);
            await this.spotify?.player.setPlaybackVolume(newVolume, this.deviceId);
        }
    }
}
