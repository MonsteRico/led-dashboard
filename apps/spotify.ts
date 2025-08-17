import { SpotifyApi, type PlaybackState, type Track, type TrackItem } from "@spotify/web-api-ts-sdk";
import type DevMatrix from "../DevMatrix";
import App from "./app";
import { spotifyIntegration } from "@/modules/spotify/spotify-integration";
import { type Image, sharpToUint8Array } from "@/modules/preload/preloadImages";
import { fonts } from "@/modules/preload/preload";
import Color from "color";
import sharp from "sharp";

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
        if (this.isPlaying) {
            this.drawPause({ x: 48, y: 19 });
        } else {
            this.drawPlay({ x: 48, y: 19 });
        }
        this.drawProgress({ x: 40, y: 27 });
        this.matrix.font(fonts["6x13"]);
        this.matrix.drawText(this.currentTrack?.name ?? "", 36, -1);
        this.matrix.font(fonts["5x7"]);
        this.matrix.drawText(this.currentTrack?.artists[0].name ?? "", 36, 12);
        if (this.albumArtImage) {
            this.matrix.drawImage(this.albumArtImage, 0, 0);
        }
    }

    public updateStateVariables() {
        if (this.currentPlaybackState) {
            this.currentTrack = this.currentPlaybackState.item as Track;
            this.albumArtUrl = this.currentTrack.album.images[0].url;
            this.deviceId = this.currentPlaybackState.device.id;
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
        await this.setAlbumArt();
        // Cancel the background update interval and replace it with one that updates every 5 seconds
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
        }
        this.backgroundInterval = setInterval(() => this.backgroundUpdate(), 1000 * 5);
    }

    public async onStop() {
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

    public async onExit() {
        if (Bun.file("albumArt.png")) {
            await Bun.file("albumArt.png").delete();
        }
    }

    public backgroundUpdate() {
        this.updateCurrentPlaybackState().then(() => {
            if (this.albumArtUrl !== this.currentTrack?.album.images[0].url || !this.albumArtImage) {
                this.setAlbumArt();
            }
        });
    }

    public async initialize() {
        try {
            this.spotify = await spotifyIntegration.getApi();
        } catch (error) {
            console.error("Error initializing Spotify:", error);
        }
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

    private async setAlbumArt() {
        if (this.albumArtUrl) {
            try {
                const albumArt = await fetch(this.albumArtUrl);
                if (!albumArt.ok) {
                    console.error("Failed to fetch album art:", albumArt.status, albumArt.statusText);
                    return;
                }

                const albumArtBuffer = await albumArt.arrayBuffer();
                const albumArtFile = await Bun.file("albumArt.png");
                await albumArtFile.write(albumArtBuffer);
                const resized = await sharp("albumArt.png")
                    .resize({
                        width: 32,
                        height: 32,
                        fit: "contain",
                    })
                    .toBuffer();
                const resizedMetadata = await sharp(resized).metadata();
                console.log("RESIZED");
                console.log(resizedMetadata.width, resizedMetadata.height);
                const albumArtImageData = await sharpToUint8Array(sharp(resized), false);
                console.log("ALBUM ART IMAGE DATA");
                console.log(albumArtImageData);
                console.log(albumArtImageData.length);

                await albumArtFile.delete();
                this.albumArtImage = {
                    width: 32,
                    height: 32,
                    data: albumArtImageData,
                };
            } catch (error) {
                console.error("Error setting album art:", error);
            }
        }
    }

    // Drawing functions
    private drawPause({ x, y }: { x: number; y: number }) {
        this.matrix.font(fonts["5x8"]);
        this.matrix.drawText("\u2225", x, y, {
            color: new Color("#ffffff"),
        });
    }

    private drawPlay({ x, y }: { x: number; y: number }) {
        this.matrix.font(fonts["5x8"]);
        this.matrix.drawText("\u25B6", x, y, {
            color: new Color("#ffffff"),
        });
    }

    private drawProgress({ x, y }: { x: number; y: number }) {
        if (x < 0 || x > this.matrix.width() - 20) {
            return;
        }
        const progress = this.currentPlaybackState?.progress_ms ?? 0;
        const duration = this.currentTrack?.duration_ms ?? 0;
        // There are 20 possible pixels
        const progressPixels = Math.round((progress / duration) * 20);
        this.matrix.fgColor(new Color("#999999"));
        this.matrix.drawRect(x, y, 20, 2);
        this.matrix.fgColor(new Color("#ffffff"));
        this.matrix.drawRect(x, y, progressPixels, 2);
    }

    // Handlers

    public async handleDoublePress() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }

        try {
            await this.spotify?.player.skipToNext(this.deviceId);
            await this.backgroundUpdate();
            if (!this.isPlaying) {
                this.isPlaying = true;
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
            await this.backgroundUpdate(); // Force a background update to get the new playback state
            if (!this.isPlaying) {
                this.isPlaying = true;
                await this.spotify?.player.startResumePlayback(this.deviceId);
            }
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
                this.isPlaying = false;
                await this.spotify?.player.pausePlayback(this.deviceId);
            } else {
                this.isPlaying = true;
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
            const newVolume = Math.min(100, Math.round((this.volume + 5) / 5) * 5);
            this.volume = newVolume;
            await this.spotify?.player.setPlaybackVolume(newVolume, this.deviceId);
            await this.backgroundUpdate();
        }
    }

    public async handleRotateLeft() {
        if (!this.deviceId) {
            console.log("No device ID found");
            return;
        }
        if (this.volume !== null) {
            const newVolume = Math.max(0, Math.round((this.volume - 5) / 5) * 5);
            this.volume = newVolume;
            await this.spotify?.player.setPlaybackVolume(newVolume, this.deviceId);
            await this.backgroundUpdate();
        }
    }
}
