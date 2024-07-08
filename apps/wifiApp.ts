import Color from "color";
import type DevMatrix from "../DevMatrix";
import App from "./app";

export default class Wifi extends App {
    constructor(matrix: DevMatrix) {
        super(matrix);
    }
    public update() {
        this.matrix.fgColor(new Color("#ff0000"));
        this.matrix.fill();
        this.matrix.fgColor(new Color("#0000ff"));
        this.matrix.setPixel(0, 0);
        this.matrix.setPixel(this.matrix.width() - 1, 0);
        this.matrix.setPixel(0, this.matrix.height() - 1);
        this.matrix.setPixel(this.matrix.width() - 1, this.matrix.height() - 1);
    }
}
