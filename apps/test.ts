import Color from "color";
import type DevMatrix from "../DevMatrix";
import App from "./app";

export default class Test extends App {
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
        this.matrix.setPixel(this.matrix.width() - 1, this.matrix.height() - 1);
    }
}
