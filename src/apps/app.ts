import { images } from "@/modules/preload/preload";
import type DevMatrix from "@/DevMatrix";

export default abstract class App {
    public matrix: DevMatrix;
    public backgroundInterval: NodeJS.Timeout | null = null;
    public overrideDefaultPressOn: boolean = false;
    private showingOverrideSymbol: boolean = false;
    constructor(matrix: DevMatrix) {
        this.matrix = matrix;
    }

    public abstract update(): void;
    public drawOverrideSymbol() {
        if (this.showingOverrideSymbol) {
            if (this.overrideDefaultPressOn) {
                this.matrix.drawImage(images["pressOverride.png"], 0, 16);
            } else {
                this.matrix.drawImage(images["noPressOverride.png"], 0, 16);
            }
        }
    }
    public onStart?(): void;
    public onStop?(): void;
    public onExit?(): Promise<void>;
    public backgroundUpdate?(): void;
    public async initialize?(): Promise<void>;
    public handlePress?(): Promise<void> | void;
    public handleLongPress?(): void;
    public handleDoublePress?(): Promise<void> | void;
    public handleTriplePress?(): Promise<void> | void;
    public handleRotateRight?(): Promise<void> | void;
    public handleRotateLeft?(): Promise<void> | void;

    public toggleOverrideDefaultPress() {
        this.overrideDefaultPressOn = !this.overrideDefaultPressOn;
        this.showingOverrideSymbol = true;
        setTimeout(() => {
            this.showingOverrideSymbol = false;
        }, 2500);
    }
}
