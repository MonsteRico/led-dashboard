export interface ControlHandlers {
    singlePress?: () => void | Promise<void>;
    doublePress?: () => void | Promise<void>;
    triplePress?: () => void | Promise<void>;
    longPress?: () => void | Promise<void>;
    rotateLeft?: () => void | Promise<void>;
    rotateRight?: () => void | Promise<void>;
}

export class ControlService {
    private static instance: ControlService;
    private handlers: ControlHandlers = {};

    private constructor() {}

    public static getInstance(): ControlService {
        if (!ControlService.instance) {
            ControlService.instance = new ControlService();
        }
        return ControlService.instance;
    }

    /**
     * Register control handlers from the main application
     */
    public registerHandlers(handlers: ControlHandlers): void {
        this.handlers = { ...this.handlers, ...handlers };
    }

    /**
     * Trigger a single press
     */
    public async triggerSinglePress(): Promise<{ success: boolean; message: string }> {
        try {
            if (this.handlers.singlePress) {
                const result = this.handlers.singlePress();
                if (result instanceof Promise) {
                    await result;
                }
                return { success: true, message: "Single press triggered successfully" };
            } else {
                return { success: false, message: "Single press handler not registered" };
            }
        } catch (error) {
            console.error("Error triggering single press:", error);
            return { success: false, message: `Error triggering single press: ${error}` };
        }
    }

    /**
     * Trigger a double press
     */
    public async triggerDoublePress(): Promise<{ success: boolean; message: string }> {
        try {
            if (this.handlers.doublePress) {
                const result = this.handlers.doublePress();
                if (result instanceof Promise) {
                    await result;
                }
                return { success: true, message: "Double press triggered successfully" };
            } else {
                return { success: false, message: "Double press handler not registered" };
            }
        } catch (error) {
            console.error("Error triggering double press:", error);
            return { success: false, message: `Error triggering double press: ${error}` };
        }
    }

    /**
     * Trigger a triple press
     */
    public async triggerTriplePress(): Promise<{ success: boolean; message: string }> {
        try {
            if (this.handlers.triplePress) {
                const result = this.handlers.triplePress();
                if (result instanceof Promise) {
                    await result;
                }
                return { success: true, message: "Triple press triggered successfully" };
            } else {
                return { success: false, message: "Triple press handler not registered" };
            }
        } catch (error) {
            console.error("Error triggering triple press:", error);
            return { success: false, message: `Error triggering triple press: ${error}` };
        }
    }

    /**
     * Trigger a long press
     */
    public async triggerLongPress(): Promise<{ success: boolean; message: string }> {
        try {
            if (this.handlers.longPress) {
                const result = this.handlers.longPress();
                if (result instanceof Promise) {
                    await result;
                }
                return { success: true, message: "Long press triggered successfully" };
            } else {
                return { success: false, message: "Long press handler not registered" };
            }
        } catch (error) {
            console.error("Error triggering long press:", error);
            return { success: false, message: `Error triggering long press: ${error}` };
        }
    }

    /**
     * Trigger rotate left
     */
    public async triggerRotateLeft(): Promise<{ success: boolean; message: string }> {
        try {
            if (this.handlers.rotateLeft) {
                const result = this.handlers.rotateLeft();
                if (result instanceof Promise) {
                    await result;
                }
                return { success: true, message: "Rotate left triggered successfully" };
            } else {
                return { success: false, message: "Rotate left handler not registered" };
            }
        } catch (error) {
            console.error("Error triggering rotate left:", error);
            return { success: false, message: `Error triggering rotate left: ${error}` };
        }
    }

    /**
     * Trigger rotate right
     */
    public async triggerRotateRight(): Promise<{ success: boolean; message: string }> {
        try {
            if (this.handlers.rotateRight) {
                const result = this.handlers.rotateRight();
                if (result instanceof Promise) {
                    await result;
                }
                return { success: true, message: "Rotate right triggered successfully" };
            } else {
                return { success: false, message: "Rotate right handler not registered" };
            }
        } catch (error) {
            console.error("Error triggering rotate right:", error);
            return { success: false, message: `Error triggering rotate right: ${error}` };
        }
    }

    /**
     * Get current app information
     */
    public getCurrentAppInfo(): { currentApp: number; totalApps: number; appName?: string } {
        return {
            currentApp: this._currentApp,
            totalApps: this._totalApps,
            appName: this._appName,
        };
    }

    /**
     * Update current app information
     */
    public updateAppInfo(currentApp: number, totalApps: number, appName?: string): void {
        this._currentApp = currentApp;
        this._totalApps = totalApps;
        this._appName = appName;
    }

    private _currentApp = 0;
    private _totalApps = 0;
    private _appName?: string;
}

export const controlService = ControlService.getInstance();
