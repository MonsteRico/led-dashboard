import Color from "color";
import { LedMatrix, type FontInstance, type LedMatrixInstance, type MatrixOptions, type RuntimeOptions } from "rpi-led-matrix";
import type { Image } from "./modules/preload/preloadImages";

// Scrolling text interfaces
interface ScrollingTextOptions {
    direction?: "left" | "right";
    font?: FontInstance;
    speed?: number; // pixels per frame
    xBounds?: { start: number; end: number };
    pauseBeforeStart?: number; // frames to wait before starting
    pauseAfterEnd?: number; // frames to wait after ending before reset
    color?: Color;
    kerning?: number;
    leftShadow?: boolean;
    rightShadow?: boolean;
    pixelWidthPerChar: number; // Required: pixel width per character for text width calculation
}

interface ScrollingTextState {
    text: string;
    x: number;
    y: number;
    options: ScrollingTextOptions;
    currentX: number;
    textWidth: number;
    state: "waiting" | "scrolling" | "paused" | "centered";
    frameCount: number;
    pauseStartFrames: number;
    pauseEndFrames: number;
}

export default class DevMatrix {
    private ledMatrix: LedMatrixInstance;

    private heightValue: number;
    private widthValue: number;
    private scrollingTexts: Map<string, ScrollingTextState> = new Map();

    constructor(matrixOptions: MatrixOptions, runtimeOptions: RuntimeOptions) {
        this.ledMatrix = new LedMatrix(matrixOptions, runtimeOptions);
        this.heightValue = matrixOptions.rows;
        this.widthValue = matrixOptions.cols;
    }

    afterSync(hook: (matrix: LedMatrixInstance, dt: number, t: number) => void): this {
        this.ledMatrix!.afterSync(hook);

        return this;
    }

    bgColor(color?: Color): this | Color {
        if (!color) {
            return new Color(this.ledMatrix!.bgColor());
        }
        if (color) {
            this.ledMatrix!.bgColor(color.rgbNumber());
        }
        return this;
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

    drawBuffer(buffer: Buffer | Uint8Array, w?: number | undefined, h?: number | undefined): this {
        this.ledMatrix!.drawBuffer(buffer, w, h);
        return this;
    }

    drawCircle(x: number, y: number, r: number): this {
        this.ledMatrix!.drawCircle(x, y, r);

        return this;
    }

    // destination x/y/width/height
    drawImage(image: Image, x: number = 0, y: number = 0): this {
        this.ledMatrix.drawBuffer(image.data, image.width, image.height, x, y);

        return this;
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
        options?: { kerning?: number; color?: Color; leftShadow?: boolean; rightShadow?: boolean },
    ): this {
        let ogColor = this.fgColor() as Color;
        if (options?.color) {
            this.fgColor(options.color);
        }

        if (options?.leftShadow) {
            const fgColor = this.fgColor() as Color;
            this.fgColor(fgColor.darken(0.5));
            this.ledMatrix!.drawText(text, x - 1, y, options?.kerning ?? 0);
            this.fgColor(fgColor);
        }

        if (options?.rightShadow) {
            const fgColor = this.fgColor() as Color;
            this.fgColor(fgColor.darken(0.5));
            this.ledMatrix!.drawText(text, x + 1, y, options?.kerning ?? 0);
            this.fgColor(fgColor);
        }

        this.ledMatrix!.drawText(text, x, y, options?.kerning ?? 0);

        this.fgColor(ogColor);

        return this;
    }

    private hexToRgb(hex: string) {
        return hex
            .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => "#" + r + r + g + g + b + b)
            ?.substring(1)
            ?.match(/.{2}/g)
            ?.map((x) => parseInt(x, 16));
    }

    fgColor(color?: Color): this | Color {
        if (!color) {
            return new Color(this.ledMatrix!.fgColor());
        }
        if (color) {
            this.ledMatrix!.fgColor(color.rgbNumber());
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

    /**
     * Create a scrolling text that will automatically scroll every frame
     * @param id Unique identifier for this scrolling text
     * @param text Text to scroll
     * @param x Initial x position
     * @param y Y position
     * @param options Scrolling options
     */
    createScrollingText(id: string, text: string, x: number, y: number, options: ScrollingTextOptions): this {
        const defaultOptions: ScrollingTextOptions = {
            direction: "left",
            speed: 1,
            xBounds: { start: 0, end: this.widthValue },
            pauseBeforeStart: 30,
            pauseAfterEnd: 30,
            kerning: 0,
            leftShadow: false,
            rightShadow: false,
            pixelWidthPerChar: 6, // Default 6 pixels per character
        };

        const mergedOptions = { ...defaultOptions, ...options };

        // Calculate text width using the provided pixel width per character
        const textWidth = text.length * mergedOptions.pixelWidthPerChar;

        const scrollingText: ScrollingTextState = {
            text,
            x,
            y,
            options: mergedOptions,
            currentX: x,
            textWidth,
            state: "waiting",
            frameCount: 0,
            pauseStartFrames: 0,
            pauseEndFrames: 0,
        };

        this.scrollingTexts.set(id, scrollingText);
        return this;
    }

    /**
     * Update all scrolling texts - call this every frame
     */
    updateScrollingTexts(): this {
        for (const [id, scrollingText] of this.scrollingTexts) {
            this.updateScrollingText(id);
        }
        return this;
    }

    /**
     * Update a specific scrolling text
     * @param id Scrolling text identifier
     */
    updateScrollingText(id: string): this {
        const scrollingText = this.scrollingTexts.get(id);
        if (!scrollingText) {
            return this;
        }

        const { text, y, options, textWidth } = scrollingText;
        const {
            direction,
            speed = 1,
            xBounds,
            pauseBeforeStart = 30,
            pauseAfterEnd = 30,
            font,
            color,
            kerning,
            leftShadow,
            rightShadow,
        } = options;

        console.log("Updating scrolling text", id, text, scrollingText.state, scrollingText.currentX);

        // Set font if specified
        if (font) {
            this.font(font);
        }

        // Set color if specified
        if (color) {
            this.fgColor(color);
        }

        // Check if text fits within bounds and should be centered
        const boundsWidth = (xBounds?.end ?? this.widthValue) - (xBounds?.start ?? 0);
        const shouldCenter = textWidth <= boundsWidth;

        // Calculate centered position if text should be centered
        let centeredX = scrollingText.x;
        if (shouldCenter) {
            const boundsStart = xBounds?.start ?? 0;
            centeredX = boundsStart + (boundsWidth - textWidth) / 2;
        }

        // Debug logging
        if (scrollingText.state === "waiting" && scrollingText.frameCount % 60 === 0) {
            // Log every 60 frames
            console.log(`Scrolling text "${scrollingText.text}":`);
            console.log(`  Text width: ${textWidth}, Bounds width: ${boundsWidth}`);
            console.log(`  Should center: ${shouldCenter}`);
            console.log(`  Current state: ${scrollingText.state}, Frame count: ${scrollingText.frameCount}`);
            console.log(`  Current X: ${scrollingText.currentX}, Initial X: ${scrollingText.x}`);
        }

        switch (scrollingText.state) {
            case "waiting":
                scrollingText.frameCount++;
                if (scrollingText.frameCount >= pauseBeforeStart) {
                    if (shouldCenter) {
                        // If text fits, just display it centered without scrolling
                        scrollingText.state = "centered";
                        scrollingText.currentX = centeredX;
                    } else {
                        scrollingText.state = "scrolling";
                        scrollingText.frameCount = 0;
                    }
                }
                break;

            case "scrolling":
                // Clear the previous text area
                const clearX = Math.floor(scrollingText.currentX);
                const clearWidth = Math.ceil(textWidth) + 2; // Add padding for shadows
                this.clear(clearX, y, clearX + clearWidth, y + 20); // Assuming max font height of 20

                // Update position
                if (direction === "left") {
                    scrollingText.currentX -= speed;

                    // Check if text has scrolled completely off screen
                    if (scrollingText.currentX + textWidth < (xBounds?.start ?? 0)) {
                        scrollingText.state = "paused";
                        scrollingText.frameCount = 0;
                    }
                } else {
                    scrollingText.currentX += speed;

                    // Check if text has scrolled completely off screen
                    if (scrollingText.currentX > (xBounds?.end ?? this.widthValue)) {
                        scrollingText.state = "paused";
                        scrollingText.frameCount = 0;
                    }
                }

                // Draw the text at current position
                this.drawText(text, Math.round(scrollingText.currentX), y, {
                    kerning,
                    color,
                    leftShadow,
                    rightShadow,
                });
                break;

            case "centered":
                // Draw the text centered without clearing (since it's static)
                this.drawText(text, Math.round(scrollingText.currentX), y, {
                    kerning,
                    color,
                    leftShadow,
                    rightShadow,
                });
                break;

            case "paused":
                scrollingText.frameCount++;
                if (scrollingText.frameCount >= pauseAfterEnd) {
                    // Reset to initial position
                    scrollingText.currentX = scrollingText.x;
                    scrollingText.state = "waiting";
                    scrollingText.frameCount = 0;
                }
                break;
        }

        return this;
    }

    /**
     * Remove a scrolling text
     * @param id Scrolling text identifier
     */
    removeScrollingText(id: string): this {
        this.scrollingTexts.delete(id);
        return this;
    }

    /**
     * Clear all scrolling texts
     */
    clearScrollingTexts(): this {
        this.scrollingTexts.clear();
        return this;
    }

    /**
     * Get all active scrolling text IDs
     */
    getScrollingTextIds(): string[] {
        return Array.from(this.scrollingTexts.keys());
    }

    /**
     * Check if a scrolling text exists
     * @param id Scrolling text identifier
     */
    hasScrollingText(id: string): boolean {
        return this.scrollingTexts.has(id);
    }

    /**
     * Update the text content of an existing scrolling text
     * @param id Scrolling text identifier
     * @param newText New text content
     */
    updateScrollingTextContent(id: string, newText: string): this {
        const scrollingText = this.scrollingTexts.get(id);
        if (!scrollingText) {
            return this;
        }

        // Update the text
        scrollingText.text = newText;

        // Recalculate text width with new text
        scrollingText.textWidth = newText.length * scrollingText.options.pixelWidthPerChar;

        // Check if new text fits within bounds
        const boundsWidth = (scrollingText.options.xBounds?.end ?? this.widthValue) - (scrollingText.options.xBounds?.start ?? 0);
        const shouldCenter = scrollingText.textWidth <= boundsWidth;

        // Reset to initial state
        scrollingText.currentX = scrollingText.x;
        scrollingText.state = "waiting";
        scrollingText.frameCount = 0;

        return this;
    }

    /**
     * Update scrolling text in a single function call (alternative to createScrollingText + updateScrollingTexts)
     * @param text Text to scroll
     * @param x Current x position
     * @param y Y position
     * @param options Scrolling options
     * @param state Optional state object for tracking position and timing
     */
    scrollText(
        text: string,
        x: number,
        y: number,
        options: ScrollingTextOptions,
        state?: Partial<ScrollingTextState>,
    ): Partial<ScrollingTextState> {
        const defaultOptions: ScrollingTextOptions = {
            direction: "left",
            speed: 1,
            xBounds: { start: 0, end: this.widthValue },
            pauseBeforeStart: 30,
            pauseAfterEnd: 30,
            kerning: 0,
            leftShadow: false,
            rightShadow: false,
            pixelWidthPerChar: 6, // Default 6 pixels per character
        };

        const mergedOptions = { ...defaultOptions, ...options };
        const {
            direction,
            speed = 1,
            xBounds,
            pauseBeforeStart = 30,
            pauseAfterEnd = 30,
            font,
            color,
            kerning,
            leftShadow,
            rightShadow,
        } = mergedOptions;

        // Initialize state if not provided
        const currentState: Partial<ScrollingTextState> = {
            text,
            x,
            y,
            options: mergedOptions,
            currentX: state?.currentX ?? x,
            textWidth: state?.textWidth ?? 0,
            state: state?.state ?? "waiting",
            frameCount: state?.frameCount ?? 0,
            pauseStartFrames: state?.pauseStartFrames ?? 0,
            pauseEndFrames: state?.pauseEndFrames ?? 0,
        };

        // Calculate text width if not already calculated
        if (currentState.textWidth === 0) {
            if (font) {
                this.font(font);
            }
            // Estimate text width based on character count using provided pixel width
            currentState.textWidth = text.length * mergedOptions.pixelWidthPerChar;
            try {
                const result = this.ledMatrix!.drawText(text, -1000, -1000, kerning);
                if (result && typeof result === "object" && "width" in result) {
                    currentState.textWidth = (result as any).width;
                }
            } catch (e) {
                // Fallback to character estimation using provided pixel width
                currentState.textWidth = text.length * mergedOptions.pixelWidthPerChar;
            }
        }

        // Set font and color
        if (font) {
            this.font(font);
        }
        if (color) {
            this.fgColor(color);
        }

        // Check if text fits within bounds and should be centered
        const boundsWidth = (xBounds?.end ?? this.widthValue) - (xBounds?.start ?? 0);
        const shouldCenter = (currentState.textWidth ?? 0) <= boundsWidth;

        // Calculate centered position if text should be centered
        let centeredX = x;
        if (shouldCenter) {
            const boundsStart = xBounds?.start ?? 0;
            centeredX = boundsStart + (boundsWidth - (currentState.textWidth ?? 0)) / 2;
        }

        // Handle state transitions
        switch (currentState.state) {
            case "waiting":
                currentState.frameCount = (currentState.frameCount ?? 0) + 1;
                if ((currentState.frameCount ?? 0) >= pauseBeforeStart) {
                    if (shouldCenter) {
                        // If text fits, just display it centered without scrolling
                        currentState.state = "centered";
                        currentState.currentX = centeredX;
                    } else {
                        currentState.state = "scrolling";
                        currentState.frameCount = 0;
                    }
                }
                break;

            case "scrolling":
                // Clear the previous text area
                const clearX = Math.floor(currentState.currentX ?? x);
                const clearWidth = Math.ceil(currentState.textWidth ?? 0) + 2;
                this.clear(clearX, y, clearX + clearWidth, y + 20);

                // Update position
                if (direction === "left") {
                    currentState.currentX = (currentState.currentX ?? x) - speed;

                    if ((currentState.currentX ?? 0) + (currentState.textWidth ?? 0) < (xBounds?.start ?? 0)) {
                        currentState.state = "paused";
                        currentState.frameCount = 0;
                    }
                } else {
                    currentState.currentX = (currentState.currentX ?? x) + speed;

                    if ((currentState.currentX ?? 0) > (xBounds?.end ?? this.widthValue)) {
                        currentState.state = "paused";
                        currentState.frameCount = 0;
                    }
                }

                // Draw the text
                this.drawText(text, Math.round(currentState.currentX ?? x), y, {
                    kerning,
                    color,
                    leftShadow,
                    rightShadow,
                });
                break;

            case "centered":
                // Draw the text centered without clearing (since it's static)
                this.drawText(text, Math.round(currentState.currentX ?? x), y, {
                    kerning,
                    color,
                    leftShadow,
                    rightShadow,
                });
                break;

            case "paused":
                currentState.frameCount = (currentState.frameCount ?? 0) + 1;
                if ((currentState.frameCount ?? 0) >= pauseAfterEnd) {
                    currentState.currentX = x;
                    currentState.state = "waiting";
                    currentState.frameCount = 0;
                }
                break;
        }

        return currentState;
    }
}
