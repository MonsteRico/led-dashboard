import type DevMatrix from "../DevMatrix";

export default abstract class App {
    public matrix: DevMatrix;
    public backgroundInterval: NodeJS.Timeout | null = null;
    constructor(matrix: DevMatrix) {
        this.matrix = matrix;
    }

    public abstract update(): void;
    public onStart?(): void;
    public backgroundUpdate?(): void;
    public async initialize?(): Promise<void>;
}