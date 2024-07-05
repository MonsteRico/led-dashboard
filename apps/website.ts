import { DateTime } from "luxon";
import type DevMatrix from "../DevMatrix";
import App from "./app";
import { fonts, images } from "../preload";
import { getWeatherCodeIcon, getWeatherData, type WeatherData } from "../weather";
import Color from "color";

export default class Website extends App {
    private buffer = new Uint8Array(this.matrix.width() * this.matrix.height() * 3);

    constructor(matrix: DevMatrix) {
        super(matrix);
        const refreshTime = 1000 * 60 * 5; // 5 minutes
        this.backgroundInterval = setInterval(() => this.backgroundUpdate(), refreshTime);
    }

    public update() {
        
    }

    public onStart() {
        console.log(this.buffer)
        console.log(this.buffer.length);
        console.log(this.matrix.width() * this.matrix.height() * 3);
    }

    public backgroundUpdate() {
        this.getBuffer();
    }

    public async initialize() {
        this.getBuffer();
    }

    private getBuffer() {
        // fetch from https://led-dashboard-web.vercel.app/image
        fetch("https://led-dashboard-web.vercel.app/image")
            .then(response => response.json())
            .then(jsonResponse => console.log(jsonResponse));
    }
}
