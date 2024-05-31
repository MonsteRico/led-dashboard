import { Font, type FontInstance } from "rpi-led-matrix";
import { basename } from "path";
import { registerFont } from "canvas";
export default class DevFont {
	private _name: string;
	private _path: string;
	public matrixFont: FontInstance | null = null;
	private ext = ".bdf";

	constructor(path: string, enableMatrix: boolean) {
		try {
			this._name = basename(path, this.ext);
			this._path = path;
			console.log(path + " loaded as '" + this._name + "'");
			if (enableMatrix) {
				this.matrixFont = new Font(basename(path, this.ext), path);
			}
		} catch (e) {
            console.log(e);
			throw new Error("Could not load font, it wasn't .bdf");
		}
	}

	name(): string {
		return this._name;
	}

	path(): string {
		return this._path;
	}
	baseline() {
		if (!this.matrixFont) {
			throw new Error("Matrix Font is not loaded");
		}
		return this.matrixFont.baseline();
	}
	height(): number {
		if (!this.matrixFont) {
			throw new Error("Matrix Font is not loaded");
		}
		return this.matrixFont.height();
	}
	stringWidth(str: string, kerning?: number | undefined): number {
		if (!this.matrixFont) {
			throw new Error("Matrix Font is not loaded");
		}
		return this.matrixFont.stringWidth(str, kerning);
	}
}
