import type DevMatrix from "../DevMatrix";

export default abstract class App {
    public matrix: DevMatrix;
    public backgroundInterval: NodeJS.Timeout | null = null;
    public overrideDefaultPressOn: boolean = false;
    constructor(matrix: DevMatrix) {
        this.matrix = matrix;
    }

    public abstract update(): void;
    public onStart?(): void;
    public backgroundUpdate?(): void;
    public async initialize?(): Promise<void>;
    public handlePress?(): void;
    public handleLongPress?(): void;
    public handleDoublePress?(): void;
    public handleTriplePress?(): void;
    public handleRotateRight?(): void;
    public handleRotateLeft?(): void;
}
