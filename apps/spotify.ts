import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import type DevMatrix from "../DevMatrix";
import App from "./app";

export default class Spotify extends App {
    private spotify: SpotifyApi;

    constructor(matrix: DevMatrix) {
        super(matrix);
        this.spotify = SpotifyApi.withClientCredentials(
            process.env.SPOTIFY_CLIENT_ID as string,
            process.env.SPOTIFY_CLIENT_SECRET as string,
            [],
            {},
        );
    }

    public update() {}

    public onStart() {}

    public backgroundUpdate() {}

    public async initialize() {
        const currentTrack = await this.spotify.player.getCurrentlyPlayingTrack();
        const currentPlaybackState = await this.spotify.player.getPlaybackState();
        console.log("Current Track", currentTrack);
        console.log("Current Playback State", currentPlaybackState);
    }
}
