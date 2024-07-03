import { DateTime } from "luxon";
import type DevMatrix from "../DevMatrix";
import App from "./app";
import { fonts, images } from "../preload";
import { getWeatherCodeIcon, weatherData } from "../weather";
import Color from "color";

export default class Weather extends App {
    private time = DateTime.now();
    constructor(matrix: DevMatrix) {
        super(matrix);

    }

    public update() {
        this.matrix.font(fonts["7x13"]);
        this.matrix.drawImage(images["spaceManatee.png"], this.matrix.width() - 18, 1);
        const weatherCode = weatherData.current.weatherCode;
        const weatherImage = getWeatherCodeIcon(weatherCode);
        if (weatherImage) {
            this.matrix.drawImage(images[weatherImage], 1, 4);
        } else {
            this.matrix.drawText("?", 1, 4, { color: new Color("#ff0000") });
        }
        const temperature = Math.round(weatherData.current.temperature2m);
        this.matrix.drawText(`${temperature}°F`, 18, 6, { color: new Color("#fdb813"), rightShadow: true });
        this.matrix.font(fonts["6x9"]);
        this.matrix.drawText(this.time.toFormat("EEE"), 2, 21, { color: new Color("#fdb813"), rightShadow: true });
        this.matrix.drawText(this.time.toFormat("MMM"), 23, 21, { color: new Color("#fdb813"), rightShadow: true });
        this.matrix.drawText(this.time.toFormat("d"), 42, 21, { color: new Color("#fdb813"), rightShadow: true });
    }

    public onStart() {
        // Clock.update();
    }

    public backgroundUpdate() {
        // Clock.update();
    }
}
