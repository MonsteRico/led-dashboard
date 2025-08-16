import { SpotifyApi, type PlaybackState, type Track } from "@spotify/web-api-ts-sdk";
import type DevMatrix from "../DevMatrix";
import App from "./app";
import { spotifyIntegration } from "@/modules/spotify/spotify-integration";

export default class Spotify extends App {
    private spotify: SpotifyApi | null = null;
    private currentTrack: PlaybackState | null = null;
    private currentPlaybackState: PlaybackState | null = null;

    constructor(matrix: DevMatrix) {
        super(matrix);
    }

    public update() {}

    public onStart() {
        if (!this.spotify) {
            try {
                this.spotify = spotifyIntegration.getApi();
                if (this.spotify) {
                    this.spotify.player.getCurrentlyPlayingTrack().then((track) => {
                        this.currentTrack = track;
                    });
                    this.spotify.player.getPlaybackState().then((state) => {
                        this.currentPlaybackState = state;
                    });
                } else {
                    console.log("Spotify not authenticated. Please login via the web interface.");
                }
            } catch (error) {
                console.error("Error initializing Spotify:", error);
            }
        }
    }

    public backgroundUpdate() {}

    public async initialize() {
        try {
            this.spotify = spotifyIntegration.getApi();
            if (this.spotify) {
                const currentTrack = await this.spotify.player.getCurrentlyPlayingTrack();
                const currentPlaybackState = await this.spotify.player.getPlaybackState();
                this.currentTrack = currentTrack;
                this.currentPlaybackState = currentPlaybackState;
            } else {
                console.log("Spotify not authenticated. Please login via the web interface.");
            }
        } catch (error) {
            console.error("Error initializing Spotify:", error);
        }
    }

    public handlePress() {
        if (this.currentPlaybackState) {
            console.log("Current Playback State", this.currentPlaybackState);
        }
        if (this.currentTrack) {
            console.log("Current Track", this.currentTrack);
        }
    }
}
