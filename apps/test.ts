import Color from "color";
import type DevMatrix from "../DevMatrix";
import App from "./app";
import { fonts } from "../preload";

export default class Test extends App {
    private text = "";
    constructor(matrix: DevMatrix) {
        super(matrix);
    }
    public update() {
        this.matrix.fgColor(new Color("#ffff00"));
        this.matrix.fill();
        this.matrix.fgColor(new Color("#00ff00"));
        this.matrix.setPixel(0, 0);
        this.matrix.setPixel(this.matrix.width() - 1, 0);
        this.matrix.setPixel(0, this.matrix.height() - 1);
        this.matrix.font(fonts["spleen-8x16"]);
        this.matrix.setPixel(this.matrix.width() - 1, this.matrix.height() - 1);
        this.matrix.drawText(this.text, 16, 16);
    }

    public handleDoublePress() {
        this.text = "double";
    }

    public handleTriplePress(): void {
        this.text = "triple";
    }

    public handleLongPress(): void {
        this.text = `long, ${this.overrideDefaultPressOn ? "OR yes" : "OR no"}`;
        this.toggleOverrideDefaultPress();
    }

    public handlePress(): void {
        this.text = "single";
    }
}
