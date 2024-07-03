import { DateTime } from "luxon";
import App from "./app";
import Color from "color";
import { fonts } from "../preload";
import type DevMatrix from "../DevMatrix";

export default class Clock extends App {
    private time: DateTime = DateTime.now();

    constructor(matrix: DevMatrix) {
        super(matrix);
    }

    public update() {
        this.time = DateTime.now();
        // await matrix.drawImage("moon.png", 0, 0);
        this.matrix.fgColor(new Color("#ff0000"));
        this.matrix.font(fonts["spleen-8x16"]);
        this.matrix.drawText(this.time.toLocaleString(DateTime.TIME_SIMPLE), 0, 8);
        this.matrix.font(fonts["6x9"]);
        this.matrix.fgColor(new Color("#00ff00"));
        this.matrix.drawText(this.time.toFormat("EEE LLL d"), 2, 21);
    }
}
