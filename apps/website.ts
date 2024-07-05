import type DevMatrix from "../DevMatrix";
import App from "./app";


export default class Website extends App {
    private buffer : Uint8Array | null;

    constructor(matrix: DevMatrix) {
        super(matrix);
        this.buffer = null;
        const refreshTime = 1000 * 60 * 5; // 5 minutes
        this.backgroundInterval = setInterval(() => this.backgroundUpdate(), refreshTime);
    }

    public update() {
        if (!this.buffer) return;
        this.matrix.drawBuffer(this.buffer);
    }

    public onStart() {
        if (!this.buffer) return;
        this.getBuffer();
    }

    public backgroundUpdate() {
        this.getBuffer();
    }

    public async initialize() {
        this.getBuffer();
    }

    private getBuffer() {
        // fetch from https://led-dashboard-web.vercel.app/image
        fetch("https://led-dashboard-web.vercel.app/image")
            .then(response => response.json())
            .then(jsonResponse => JSON.parse(jsonResponse.rawBuffer))
            .then(rawBuffer => {
                // Convert the object back to Uint8Array
                const values = Object.values(rawBuffer.rawBuffer) as number[];
                const uint8Array = new Uint8Array(values);
                this.buffer = uint8Array;
            });
    }
}
