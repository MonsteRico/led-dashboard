import { GpioMapping, LedMatrix, RuntimeFlag } from "rpi-led-matrix";
import { Settings } from "luxon";
import readline from "readline";
import DevMatrix from "./DevMatrix";
import { fonts } from "./modules/preload/preload";
import type App from "@/apps/app";
import { WebServer } from "@/modules/webconfig/server";
import { appRegistry } from "@/modules/config/app-registry";
import { registerAllApps } from "@/modules/config/app-registrations";
import { weatherService } from "@/modules/weather/weather-service";
import { controlService } from "@/modules/control/control-service";
import { updateService } from "@/modules/update/update-service";

// Configure the time zone
Settings.defaultZone = "America/Indianapolis";

(async () => {
    // Initialize the matrix
    let matrix = new DevMatrix(
        {
            ...LedMatrix.defaultMatrixOptions(),
            cols: 64,
            hardwareMapping: GpioMapping.AdafruitHatPwm,
            limitRefreshRateHz: 150,
            rows: 32,
            showRefreshRate: true,
        },
        {
            ...LedMatrix.defaultRuntimeOptions(),
            daemon: RuntimeFlag.Off,
            dropPrivileges: RuntimeFlag.Off,
            gpioSlowdown: 3,
        },
    );

    // Set default font and clear the matrix
    matrix.font(fonts["7x13"]);
    matrix.clear().sync();

    // Initialize weather service
    await weatherService.initialize();

    // Register all apps
    await registerAllApps();

    // Check and update app status based on environment variables
    await appRegistry.updateAppStatusBasedOnEnvVars();

    // Start the web server
    const serverConfig = {
        port: 3000,
        useHttps: process.env.USE_HTTPS === "true",
        certPath: process.env.SSL_CERT_PATH || "ssl/certificate.pem",
        keyPath: process.env.SSL_KEY_PATH || "ssl/private-key.pem",
    };

    const webServer = new WebServer(serverConfig);
    webServer.start();

    // Create enabled apps using the registry
    const enabledApps = appRegistry.createEnabledApps(matrix);

    // Initialize apps if they have an initialize method
    for (const app of enabledApps) {
        await app.initialize?.();
    }

    // Set app context for update service
    updateService.setAppContext({
        apps: enabledApps,
        matrix: matrix,
        webServer: webServer,
    });

    let currentAppNumber = 0;

    // Register control handlers with the control service
    controlService.registerHandlers({
        singlePress: () => {
            const app = enabledApps[currentAppNumber];
            if (app.overrideDefaultPressOn && app.handlePress) {
                console.log("App handling press");
                const result = app.handlePress();
                if (result instanceof Promise) {
                    result.catch((error: unknown) => {
                        console.error("Error in handlePress:", error);
                    });
                }
            } else {
                console.log("Switching apps");
                switchNextApp();
            }
        },
        doublePress: () => {
            const app = enabledApps[currentAppNumber];
            if (app.handleDoublePress) {
                console.log("App handling double press");
                const result = app.handleDoublePress();
                if (result instanceof Promise) {
                    result.catch((error: unknown) => {
                        console.error("Error in handleDoublePress:", error);
                    });
                }
            }
        },
        triplePress: () => {
            const app = enabledApps[currentAppNumber];
            if (app.handleTriplePress) {
                console.log("App handling triple press");
                const result = app.handleTriplePress();
                if (result instanceof Promise) {
                    result.catch((error: unknown) => {
                        console.error("Error in handleTriplePress:", error);
                    });
                }
            }
        },
        longPress: () => {
            const app = enabledApps[currentAppNumber];
            if (app.handleLongPress) {
                console.log("App handling long press");
                app.handleLongPress();
            }
        },
        rotateLeft: () => {
            const app = enabledApps[currentAppNumber];
            if (app.handleRotateLeft) {
                console.log("App handling rotate left");
                const result = app.handleRotateLeft();
                if (result instanceof Promise) {
                    result.catch((error: unknown) => {
                        console.error("Error in handleRotateLeft:", error);
                    });
                }
            }
        },
        rotateRight: () => {
            const app = enabledApps[currentAppNumber];
            if (app.handleRotateRight) {
                console.log("App handling rotate right");
                const result = app.handleRotateRight();
                if (result instanceof Promise) {
                    result.catch((error: unknown) => {
                        console.error("Error in handleRotateRight:", error);
                    });
                }
            }
        },
    });

    // Update app info in control service
    controlService.updateAppInfo(currentAppNumber, enabledApps.length, enabledApps[currentAppNumber]?.constructor.name);

    // Keypress handling for the terminal
    const MULTI_PRESS_THRESHOLD = 300; // ms between presses
    const LONG_PRESS_THRESHOLD = 500; // ms to trigger long press
    const LONG_PRESS_CHECK_INTERVAL = 50; // ms polling interval while holding
    const ROTATE_THROTTLE_DELAY = 150; // ms minimum delay between rotate calls

    let pressCount = 0;
    let lastPressTime = 0;
    let keyDownTime: number | null = null;
    let longPressTriggered = false;
    let keyIsDown = false;
    let pressTimer: NodeJS.Timeout | null = null;
    let releaseTimer: NodeJS.Timeout | null = null;
    let longPressInterval: NodeJS.Timeout | null = null;

    // Rotate throttling variables - prevents rotate functions from being called too frequently
    // This is especially important for apps that make API calls (like Spotify volume control)
    let lastRotateLeftTime = 0;
    let lastRotateRightTime = 0;

    const switchNextApp = (): void => {
        enabledApps[currentAppNumber].onStop?.();
        currentAppNumber = (currentAppNumber + 1) % enabledApps.length;
        console.log("Switching to app " + currentAppNumber);
        enabledApps[currentAppNumber].onStart?.();

        // Update control service with new app info
        controlService.updateAppInfo(currentAppNumber, enabledApps.length, enabledApps[currentAppNumber]?.constructor.name);
    };

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    process.stdin.on("keypress", (_chunk: string, key: readline.Key) => {
        if (!key) return;

        const app = enabledApps[currentAppNumber];

        if (key.name === "q") exit(enabledApps);

        if (key.name === "space") {
            if (keyIsDown) return; // Ignore repeats while held down
            keyIsDown = true;

            const now = Date.now();

            if (now - lastPressTime <= MULTI_PRESS_THRESHOLD) {
                pressCount++;
            } else {
                pressCount = 1;
            }
            lastPressTime = now;

            keyDownTime = now;
            longPressTriggered = false;

            // Start polling interval to detect long press during hold
            if (longPressInterval) clearInterval(longPressInterval);
            longPressInterval = setInterval(() => {
                if (!keyDownTime) return;
                const elapsed = Date.now() - keyDownTime;
                if (elapsed >= LONG_PRESS_THRESHOLD && !longPressTriggered) {
                    longPressTriggered = true;
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                }
            }, LONG_PRESS_CHECK_INTERVAL);

            // Clear previous multi-press timer; will trigger after MULTI_PRESS_THRESHOLD ms of no presses
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = setTimeout(() => {
                // Only fire if no long press occurred
                if (!longPressTriggered) {
                    if (pressCount === 1 && !keyIsDown) {
                        console.log("\nSingle Press");
                        if (app.overrideDefaultPressOn && app.handlePress) {
                            console.log("\nApp handling press");
                            const result = app.handlePress();
                            if (result instanceof Promise) {
                                result.catch((error: unknown) => {
                                    console.error("Error in handlePress:", error);
                                });
                            }
                        } else {
                            console.log("\nSwitching apps");
                            switchNextApp();
                        }
                    } else if (pressCount === 2 && !keyIsDown) {
                        console.log("\nDouble Press");
                        if (app.handleDoublePress) {
                            console.log("\nApp handling double press");
                            const result = app.handleDoublePress();
                            if (result instanceof Promise) {
                                result.catch((error: unknown) => {
                                    console.error("Error in handleDoublePress:", error);
                                });
                            }
                        }
                    } else if (pressCount >= 3 && !keyIsDown) {
                        console.log("Triple Press");
                        if (app.handleTriplePress) {
                            console.log("\nApp handling triple press");
                            const result = app.handleTriplePress();
                            if (result instanceof Promise) {
                                result.catch((error: unknown) => {
                                    console.error("Error in handleTriplePress:", error);
                                });
                            }
                        }
                    }
                }
                pressCount = 0;
                pressTimer = null;
            }, MULTI_PRESS_THRESHOLD);
        }

        if (key.name === "left") {
            const now = Date.now();
            if (now - lastRotateLeftTime >= ROTATE_THROTTLE_DELAY) {
                console.log("\nRotating Left");
                if (app.handleRotateLeft) {
                    console.log("\nApp handling rotate left");
                    const result = app.handleRotateLeft();
                    if (result instanceof Promise) {
                        result.catch((error: unknown) => {
                            console.error("Error in handleRotateLeft:", error);
                        });
                    }
                }
                lastRotateLeftTime = now;
            }
        } else if (key.name === "right") {
            const now = Date.now();
            if (now - lastRotateRightTime >= ROTATE_THROTTLE_DELAY) {
                console.log("\nRotating Right");
                if (app.handleRotateRight) {
                    console.log("\nApp handling rotate right");
                    const result = app.handleRotateRight();
                    if (result instanceof Promise) {
                        result.catch((error: unknown) => {
                            console.error("Error in handleRotateRight:", error);
                        });
                    }
                }
                lastRotateRightTime = now;
            }
        }
    });

    process.stdin.on("data", (data: Buffer) => {
        if (data.toString() === " ") {
            const app = enabledApps[currentAppNumber];
            if (releaseTimer) clearTimeout(releaseTimer);
            releaseTimer = setTimeout(() => {
                if (keyIsDown) {
                    keyIsDown = false;
                    const now = Date.now();
                    const holdDuration = keyDownTime ? now - keyDownTime : 0;

                    if (longPressTriggered) {
                        console.log("\nLong press");
                        if (app.handleLongPress) {
                            console.log("\nApp handling long press");
                            app.handleLongPress();
                        }

                        // Important: reset pressCount and clear timers so multi-press won't fire again
                        pressCount = 0;

                        if (pressTimer) {
                            clearTimeout(pressTimer);
                            pressTimer = null;
                        }
                    } else if (holdDuration < LONG_PRESS_THRESHOLD && pressTimer) {
                        // Let the multi-press timer handle single/double/triple press firing,
                        // so do nothing here.
                    }

                    keyDownTime = null;
                    if (longPressInterval) {
                        clearInterval(longPressInterval);
                        longPressInterval = null;
                    }
                }
            }, 50); // simulate key release after short delay
        }
    });
    // Update the matrix every frame
    matrix.afterSync((mat, dt, t) => {
        matrix.clear();
        enabledApps[currentAppNumber].update();
        enabledApps[currentAppNumber].drawOverrideSymbol();
        setTimeout(() => matrix.sync(), 0);
    });

    // Start the matrix
    matrix.sync();
})();

async function exit(apps: App[]) {
    // Stop the background intervals for good measure
    for (const app of apps) {
        if (app.backgroundInterval) {
            clearInterval(app.backgroundInterval);
            app.backgroundInterval = null;
        }
        if (app.onExit) {
            await app.onExit();
        }
    }

    process.exit();
}
