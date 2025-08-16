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
        const refreshTime = 1000 * 10 * 5; // 5 minutes
        this.backgroundInterval = setInterval(() => this.backgroundUpdate(), refreshTime);
    }

    public async updateCurrentPlaybackState() {
        if (this.spotify) {
            const currentPlaybackState = await this.spotify.player.getPlaybackState();
            this.currentPlaybackState = currentPlaybackState;
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

    public handleDoublePress() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        this.spotify?.player.skipToNext(this.deviceId);
        if (!this.isPlaying) {
            this.spotify?.player.startResumePlayback(this.deviceId);
        }
    }

    public handleTriplePress() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        this.spotify?.player.skipToPrevious(this.deviceId);
    }

    public handleLongPress() {
        this.toggleOverrideDefaultPress();
    }

    public handlePress() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        if (this.isPlaying) {
            this.spotify?.player.pausePlayback(this.deviceId);
        } else {
            this.spotify?.player.startResumePlayback(this.deviceId);
        }
    }

    public handleRotateRight() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        if (this.volume) {
            this.spotify?.player.setPlaybackVolume(this.volume + 1, this.deviceId);
        }
    }

    public handleRotateLeft() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        if (this.volume) {
            this.spotify?.player.setPlaybackVolume(this.volume - 1, this.deviceId);
        }
    }
}
