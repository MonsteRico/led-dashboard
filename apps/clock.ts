import { DateTime } from "luxon";
import App from "./app";
import Color from "color";
import { fonts, images } from "../preload";
import type DevMatrix from "../DevMatrix";

export default class Clock extends App {
    private time: DateTime = DateTime.now();

    constructor(matrix: DevMatrix) {
        super(matrix);
    }

    public update() {
        this.time = DateTime.now();
        this.matrix.drawImage(images["flowerBG.png"], 0, 0);
        this.matrix.fgColor(new Color("#ffffff"));
        this.matrix.font(fonts["spleen-8x16"]);
        this.matrix.drawText(this.time.toLocaleString(DateTime.TIME_SIMPLE), 4, 4, { rightShadow: true });
        this.matrix.font(fonts["6x9"]);
        this.matrix.fgColor(new Color("#ffffff"));
        this.matrix.drawText(this.time.toFormat("EEE LLL d"), 2, 21, { rightShadow: true });
    }
}
