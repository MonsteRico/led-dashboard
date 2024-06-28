import Color from "color";
import { LedMatrix } from "rpi-led-matrix";
import type {
    FontInstance,
  LedMatrixInstance,
  MatrixOptions,
  RuntimeOptions,
} from "rpi-led-matrix/dist/types";
export default class DevMatrix {
  private ledMatrix: LedMatrixInstance | null;

  private heightValue: number;
  private widthValue: number;

  constructor(
    matrixOptions: MatrixOptions,
    runtimeOptions: RuntimeOptions,
    enableMatrix?: boolean
  ) {
    this.ledMatrix = new LedMatrix(matrixOptions, runtimeOptions);
    this.heightValue = matrixOptions.rows;
    this.widthValue = matrixOptions.cols;
  }

  afterSync(
    hook: (matrix: LedMatrixInstance, dt: number, t: number) => void
  ): this {
    this.ledMatrix!.afterSync(hook);

    return this;
  }

  bgColor(color?: Color): this | Color {
    throw new Error("it does nothing?");
  }

  brightness(brightness?: number): this | number {
    if (!brightness) {
      return this.ledMatrix!.brightness();
    }
    this.ledMatrix!.brightness(brightness);

    return this;
  }

  clear(x0?: number, y0?: number, x1?: number, y1?: number): this {
    if (x0 && y0 && x1 && y1) {
      this.ledMatrix!.clear(x0, y0, x1, y1);
    } else {
      this.ledMatrix!.clear();
    }
    return this;
  }

  drawBuffer(
    buffer: Buffer | Uint8Array,
    w?: number | undefined,
    h?: number | undefined
  ): this {
    throw new Error("Method not implemented.");
  }

  drawCircle(x: number, y: number, r: number): this {
    this.ledMatrix!.drawCircle(x, y, r);

    return this;
  }

  // destination x/y/width/height
  async drawImage(
    imagePath: string,
    xVal: number,
    yVal: number,
    w?: number,
    h?: number
  ): Promise<this> {
    throw new Error("Method not implemented.");
  }

  drawLine(x0: number, y0: number, x1: number, y1: number): this {
    this.ledMatrix!.drawLine(x0, y0, x1, y1);

    return this;
  }

  drawRect(x0: number, y0: number, width: number, height: number): this {
    this.ledMatrix!.drawRect(x0, y0, width, height);

    return this;
  }

  drawText(
    text: string,
    x: number,
    y: number,
    kerning?: number | undefined
  ): this {
    this.ledMatrix!.drawText(text, x, y, kerning);

    return this;
  }

private hexToRgb(hex:string) {
  return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
      , (m, r, g, b) => "#" + r + r + g + g + b + b)
      ?.substring(1)?.match(/.{2}/g)
      ?.map(x => parseInt(x, 16));
}
private getFillColor(color:string) {
  let rgbColor = this.hexToRgb(color)!;
  let reversed = rgbColor.reverse();
  let hex = 0x000000 | (reversed[0] << 16) | (reversed[1] << 8) | reversed[2];

  return parseInt(`0x${(hex >>> 0).toString(16)}`);
}

  fgColor(color?: Color): this | Color {
    if (!color) {
      return new Color(this.ledMatrix!.fgColor());
    }
    if (color) {
      console.log(this.getFillColor(color.hex()), "vs", color.hex(), "vs" , color.rgbNumber());
      this.ledMatrix!.fgColor(0xff00000);
    }
    return this;
  }

  fill(x0?: number, y0?: number, x1?: number, y1?: number): this {
    if (x0 && y0 && x1 && y1) {
      this.ledMatrix!.fill(x0, y0, x1, y1);
    } else {
      this.ledMatrix!.fill();
    }

    return this;
  }

  font(font?: FontInstance): this | string | null {
    if (!font) {
      return this.ledMatrix!.font();
    }

    this.ledMatrix!.font(font);

    return this;
  }

  getAvailablePixelMappers(): string[] {
    return this.ledMatrix!.getAvailablePixelMappers();
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
    this.ledMatrix!.luminanceCorrect(correct);

    return this;
  }

  // coords are [x, y, index]
  map(cb: (coords: [number, number, number], t: number) => number): this {
    this.ledMatrix!.map(cb);

    return this;
  }

  pwmBits(pwmBits?: number): number | this {
    if (!pwmBits) {
      return this.ledMatrix!.pwmBits();
    }
    this.ledMatrix!.pwmBits(pwmBits);

    return this;
  }

  setPixel(x: number, y: number): this {
    this.ledMatrix!.setPixel(x, y);

    return this;
  }

  private lastSyncTime = Date.now();

  sync(): void {
    this.ledMatrix!.sync();
  }
}
