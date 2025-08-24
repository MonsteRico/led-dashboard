import { DateTime } from "luxon";
import type DevMatrix from "@/DevMatrix";
import App from "./app";
import { fonts, images } from "@/modules/preload/preload";
import { weatherService } from "@/modules/weather/weather-service";
import Color from "color";

export default class Weather extends App {
    private time = DateTime.now();
    private weatherCode: number;
    private temperature: number;
    private isDay: boolean;

    constructor(matrix: DevMatrix) {
        super(matrix);
        this.weatherCode = 0;
        this.temperature = 0;
        this.isDay = true;
        const refreshTime = 1000 * 60 * 5; // 5 minutes
        this.backgroundInterval = setInterval(() => this.backgroundUpdate(), refreshTime);
    }

    public update() {
        this.matrix.font(fonts["7x13"]);
        this.matrix.drawImage(images["spaceManatee.png"], this.matrix.width() - 18, 1);
        const weatherImage = weatherService.getWeatherCodeIcon(this.weatherCode, this.isDay);
        if (weatherImage) {
            this.matrix.drawImage(images[weatherImage], 1, 4);
        } else {
            this.matrix.drawText("?", 1, 4, { color: new Color("#ff0000") });
        }
        this.matrix.drawText(`${this.temperature}°F`, 18, 6, { color: new Color("#fdb813"), rightShadow: true });
        this.matrix.font(fonts["6x9"]);
        this.matrix.drawText(this.time.toFormat("EEE"), 2, 21, { color: new Color("#fdb813"), rightShadow: true });
        this.matrix.drawText(this.time.toFormat("MMM"), 23, 21, { color: new Color("#fdb813"), rightShadow: true });
        this.matrix.drawText(this.time.toFormat("d"), 42, 21, { color: new Color("#fdb813"), rightShadow: true });
    }

    public onStart() {
        weatherService.getWeatherData().then((weatherData) => {
            this.weatherCode = weatherData.current.weatherCode;
            this.temperature = Math.round(weatherData.current.temperature2m);
            this.isDay = weatherData.current.isDay === 1;
        });
    }

    public backgroundUpdate() {
        weatherService.getWeatherData().then((weatherData) => {
            this.weatherCode = weatherData.current.weatherCode;
            this.temperature = Math.round(weatherData.current.temperature2m);
            this.isDay = weatherData.current.isDay === 1;
        });
    }

    public async initialize() {
        const weatherData = await weatherService.getWeatherData();
        this.weatherCode = weatherData.current.weatherCode;
        this.temperature = Math.round(weatherData.current.temperature2m);
        this.isDay = weatherData.current.isDay === 1;
    }
}
