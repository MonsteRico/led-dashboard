import { Canvas, CanvasRenderingContext2D, Image, createCanvas, loadImage } from "canvas";
import Color from "color";
import { LedMatrix } from "rpi-led-matrix";
import type { FontInstance, LedMatrixInstance, MatrixOptions, RuntimeOptions } from "rpi-led-matrix/dist/types";
import type DevFont from "./DevFont";
import { $Font } from "bdfparser";
import getline from "readlineiter";
export default class DevMatrix {
	private ledMatrix: LedMatrixInstance | null;
	public canvas: Canvas;
	private ctx: CanvasRenderingContext2D;
	private enabled = false;
	private bgColorValue: Color;
	private brightnessValue: number;
	private fgColorValue: Color;
	private fontValue: DevFont | null;
	private heightValue: number;
	private widthValue: number;
	private pwmBitsValue: number;
	private afterSyncCallbacks: Array<(matrix: LedMatrixInstance, dt: number, t: number) => void>;
	constructor(matrixOptions: MatrixOptions, runtimeOptions: RuntimeOptions, enableMatrix?: boolean) {
		this.ledMatrix = null;
		if (enableMatrix) {
			this.enabled = true;
			this.ledMatrix = new LedMatrix(matrixOptions, runtimeOptions);
		}
		this.canvas = createCanvas(matrixOptions.cols * 16, matrixOptions.rows * 16);
		this.ctx = this.canvas.getContext("2d")!;
		this.bgColorValue = new Color("#333333");
		this.fgColorValue = Color.rgb(0, 0, 0);
		this.brightnessValue = matrixOptions.brightness;
		this.heightValue = matrixOptions.rows;
		this.widthValue = matrixOptions.cols;
		this.fontValue = null;
		this.pwmBitsValue = 0;
		this.afterSyncCallbacks = [];
		if (!this.ctx) {
			throw new Error("Could not get 2d context");
		}
	}

	afterSync(hook: (matrix: LedMatrixInstance, dt: number, t: number) => void): this {
		if (this.enabled) {
			this.ledMatrix!.afterSync(hook);
		}
		this.afterSyncCallbacks.push(hook);
		return this;
	}

	bgColor(color?: Color): this | Color {
		throw new Error("it does nothing?");
	}

	brightness(brightness?: number): this | number {
		if (!brightness) {
			return this.brightnessValue;
		}
		if (this.enabled) {
			this.ledMatrix!.brightness(brightness);
		}
		this.brightnessValue = brightness;
		return this;
	}

	clear(x0?: number, y0?: number, x1?: number, y1?: number): this {
		if (this.enabled) {
			if (x0 && y0 && x1 && y1) {
				this.ledMatrix!.clear(x0, y0, x1, y1);
			} else {
				this.ledMatrix!.clear();
			}
		}
		if (x0 && y0 && x1 && y1) {
			this.ctx.clearRect(x0 * 16, y0 * 16, x1 * 16 - x0 * 16, y1 * 16 - y0 * 16);
		} else {
			this.ctx.clearRect(0, 0, this.widthValue * 16, this.heightValue * 16);
		}
		const previous = this.fgColor() as Color;
		this.ctx.fillStyle = this.bgColorValue.rgb().toString();
		this.ctx.fillRect(0,0,this.widthValue*16, this.heightValue*16)
		this.ctx.fillStyle = this.fgColorValue.rgb().toString();
		return this;
	}

	drawBuffer(buffer: Buffer | Uint8Array, w?: number | undefined, h?: number | undefined): this {
		throw new Error("Method not implemented.");
	}

	drawCircle(x: number, y: number, r: number): this {
		if (this.enabled) {
			this.ledMatrix!.drawCircle(x, y, r);
		}
		this.ctx.beginPath();
		this.ctx.arc(x * 16, y * 16, r * 16, 0, 2 * Math.PI);
		this.ctx.stroke();
		return this;
	}

	// destination x/y/width/height
	async drawImage(imagePath: string, xVal: number, yVal: number, w?: number, h?: number): Promise<this> {
		const image = await loadImage(imagePath);
		if (!image) {
			throw new Error("Could not load image");
		}
		if (image.width > this.widthValue || image.height > this.heightValue) {
			throw new Error("Image is too large");
		}
		const tempCanvas = createCanvas(image.width, image.height);
		const tempCtx = tempCanvas.getContext("2d")!;
		tempCtx.drawImage(image, 0, 0);
		const width = w ? w : image.width;
		const height = h ? h : image.height;
		// loop through the canvas and draw the image
		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				const pixel = tempCtx.getImageData(x, y, 1, 1).data;
				const color = new Color(pixel, "rgb");
				this.fgColor(color);
				this.setPixel(x+xVal, y+yVal);
			}
		}

		return this;
	}

	drawLine(x0: number, y0: number, x1: number, y1: number): this {
		if (this.enabled) {
			this.ledMatrix!.drawLine(x0, y0, x1, y1);
		}
		this.ctx.beginPath();
		this.ctx.moveTo(x0 * 16, y0 * 16);
		this.ctx.lineTo(x1 * 16, y1 * 16);
		this.ctx.stroke();
		return this;
	}

	drawRect(x0: number, y0: number, width: number, height: number): this {
		if (this.enabled) {
			this.ledMatrix!.drawRect(x0, y0, width, height);
		}
		this.ctx.beginPath();
		this.ctx.rect(x0 * 16, y0 * 16, width * 16, height * 16);
		this.ctx.stroke();
		return this;
	}

	async drawText(text: string, x: number, y: number, kerning?: number | undefined): Promise<this> {
		if (this.enabled) {
			this.ledMatrix!.drawText(text, x, y, kerning);
		}
		if (!this.fontValue) {
			throw new Error("Font is not loaded");
		}
		const font = await $Font(getline(this.fontValue.path()));
		// add .glow after .draw for outline
		const bmp = font.draw(text).enlarge(16, 16);
		const tempCanvas = createCanvas(bmp.width(), bmp.height());
		const tempCtx = tempCanvas.getContext("2d")!;
		// draw color
		tempCtx.fillStyle = this.fgColorValue.rgb().toString();

		bmp.draw2canvas(tempCtx, { "0": null, "1": this.fgColorValue.rgb().toString(), "2": "#000000" });

		// replace all black pixels with this.fgColor

		this.ctx.drawImage(tempCanvas, x * 16, y * 16, bmp.width(), bmp.height());

		return this;
	}

	fgColor(color?: Color): this | Color {
		if (!color) {
			return this.fgColorValue;
		}
		if (this.enabled) {
			if (color) {
				this.ledMatrix!.fgColor(color.rgbNumber());
			}
		}
		this.fgColorValue = color as Color;
		this.ctx.strokeStyle = color.rgb().toString();
		this.ctx.fillStyle = color.rgb().toString().toString();
		return this;
	}

	fill(x0?: number, y0?: number, x1?: number, y1?: number): this {
		if (this.enabled) {
			if (x0 && y0 && x1 && y1) {
				this.ledMatrix!.fill(x0, y0, x1, y1);
			} else {
				this.ledMatrix!.fill();
			}
		}
		if (x0 && y0 && x1 && y1) {
			this.ctx.fillRect(x0 * 16, y0 * 16, x1 * 16 - x0 * 16, y1 * 16 - y0 * 16);
		} else {
			this.ctx.fillRect(0, 0, this.widthValue * 16, this.heightValue * 16);
		}
		return this;
	}

	font(font?: DevFont): this | DevFont | null {
		if (!font) {
			return this.fontValue;
		}
		if (this.enabled) {
			if (!font.matrixFont) {
				throw new Error("Matrix Font is not loaded");
			}
			this.ledMatrix!.font(font.matrixFont);
		}
		this.fontValue = font;
		return this;
	}

	getAvailablePixelMappers(): string[] {
		if (this.enabled) {
			return this.ledMatrix!.getAvailablePixelMappers();
		}
		return [];
	}

	height(): number {
		return this.heightValue;
	}

	width(): number {
		return this.widthValue;
	}

	luminanceCorrect(correct?: boolean): boolean | this {
		if (correct === undefined) {
			return this.ledMatrix!.luminanceCorrect();
		}
		if (this.enabled) {
			this.ledMatrix!.luminanceCorrect(correct);
		}
		return this;
	}

	// coords are [x, y, index]
	map(cb: (coords: [number, number, number], t: number) => number): this {
		if (this.enabled) {
			this.ledMatrix!.map(cb);
		}
		let i = 0;
		// let t be the time from program start
		let t = Date.now();
		for (let x = 0; x < this.widthValue; x++) {
			for (let y = 0; y < this.heightValue; y++) {
				cb([x, y, i++], t);
			}
		}
		return this;
	}

	pwmBits(pwmBits?: number): number | this {
		if (!pwmBits) {
			return this.pwmBitsValue;
		}
		if (this.enabled) {
			this.ledMatrix!.pwmBits(pwmBits);
		}
		this.pwmBitsValue = pwmBits;
		return this;
	}

	setPixel(x: number, y: number): this {
		if (this.enabled) {
			this.ledMatrix!.setPixel(x, y);
		}
		this.ctx.fillRect(x * 16, y * 16, 16, 16);
		return this;
	}

	private lastSyncTime = Date.now();

	sync(): void {
		if (this.enabled) {
			this.ledMatrix!.sync();
		}

		for (const callback of this.afterSyncCallbacks) {
			callback(this.ledMatrix!, Date.now() - this.lastSyncTime, Date.now());
		}
	}

	grid() {
		// draw grid lines
		this.ctx.strokeStyle = "#000000";
		this.ctx.fillStyle = "rgba(0,0,0,0)";
		this.ctx.lineWidth = 2;
		for (let x = 0; x < this.widthValue; x++) {
			this.ctx.beginPath();
			this.ctx.moveTo(x * 16, 0);
			this.ctx.lineTo(x * 16, this.heightValue * 16);
			this.ctx.stroke();
		}
		for (let y = 0; y < this.heightValue; y++) {
			this.ctx.beginPath();
			this.ctx.moveTo(0, y * 16);
			this.ctx.lineTo(this.widthValue * 16, y * 16);
			this.ctx.stroke();
		}
		this.ctx.strokeStyle = this.bgColorValue.rgb().toString();
		this.ctx.fillStyle = this.fgColorValue.rgb().toString();
	}
}

