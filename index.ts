import { GpioMapping, LedMatrix, RuntimeFlag } from "rpi-led-matrix";
import { Settings } from "luxon";
import readline from "readline";
import DevMatrix from "./DevMatrix";
import { fonts } from "./preload";
import Weather from "./apps/weather";
import Clock from "./apps/clock";
import Test from "./apps/test";
import type App from "./apps/app";
import Website from "./apps/website";
import Spotify from "./apps/spotify";

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

    // Apps array from apps folder
    const apps: App[] = [];

    apps.push(new Clock(matrix));
    apps.push(new Weather(matrix));
    apps.push(new Test(matrix));
    apps.push(new Website(matrix));
    apps.push(new Spotify(matrix));

    // Initialize apps if they have an initialize method
    for (const app of apps) {
        await app.initialize?.();
    }

    const MULTI_PRESS_THRESHOLD = 300; // ms between presses
    const LONG_PRESS_THRESHOLD = 500; // ms to trigger long press
    const LONG_PRESS_CHECK_INTERVAL = 50; // ms polling interval while holding

    let currentAppNumber = 0;
    let pressCount = 0;
    let lastPressTime = 0;
    let keyDownTime: number | null = null;
    let longPressTriggered = false;
    let keyIsDown = false;
    let pressTimer: NodeJS.Timeout | null = null;
    let releaseTimer: NodeJS.Timeout | null = null;
    let longPressInterval: NodeJS.Timeout | null = null;

    const switchNextApp = (): void => {
        currentAppNumber = (currentAppNumber + 1) % apps.length;
        console.log("Switching to app " + currentAppNumber);
        apps[currentAppNumber].onStart?.();
    };

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    process.stdin.on("keypress", (_chunk: string, key: readline.Key) => {
        if (!key) return;

        const app = apps[currentAppNumber];

        if (key.name === "q") exit(apps);

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
                            app.handlePress();
                        } else {
                            console.log("\nSwitching apps");
                            switchNextApp();
                        }
                    } else if (pressCount === 2 && !keyIsDown) {
                        console.log("\nDouble Press");
                        if (app.handleDoublePress) {
                            console.log("\nApp handling double press");
                            app.handleDoublePress();
                        }
                    } else if (pressCount >= 3 && !keyIsDown) {
                        console.log("Triple Press");
                        if (app.handleTriplePress) {
                            console.log("\nApp handling triple press");
                            app.handleTriplePress();
                        }
                    }
                }
                pressCount = 0;
                pressTimer = null;
            }, MULTI_PRESS_THRESHOLD);
        }

        if (key.name === "left") {
            console.log("\nRotating Left");
            if (app.handleRotateLeft) {
                console.log("\nApp handling rotate left");
                app.handleRotateLeft();
            }
        } else if (key.name === "right") {
            console.log("\nRotating Right");
            if (app.handleRotateRight) {
                console.log("\nApp handling rotate right");
                app.handleRotateRight();
            }
        }
    });

    process.stdin.on("data", (data: Buffer) => {
        if (data.toString() === " ") {
            const app = apps[currentAppNumber];
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
        apps[currentAppNumber].update();
        setTimeout(() => matrix.sync(), 0);
    });

    // Start the matrix
    matrix.sync();
})();

function exit(apps: App[]) {
    // Stop the background intervals for good measure
    for (const app of apps) {
        if (app.backgroundInterval) {
            clearInterval(app.backgroundInterval);
            app.backgroundInterval = null;
        }
    }

    process.exit();
}
