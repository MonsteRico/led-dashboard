import type DevMatrix from "../DevMatrix";

export default abstract class App {
    public matrix: DevMatrix;
    constructor(matrix: DevMatrix) {
        this.matrix = matrix;
    }

    public abstract update(): void;
    public onStart?(): void;
    public backgroundUpdate?(): void;
}