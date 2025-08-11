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

    // Initialize apps if they have an initialize method
    for (const app of apps) {
        await app.initialize?.();
    }

    let currentAppNumber = 0;

    const defaultOnPress = (): void => {
        currentAppNumber = (currentAppNumber + 1) % apps.length;
        console.log("Switching to app " + currentAppNumber);
        apps[currentAppNumber].onStart?.();
    };

    // Actions for other press types
    const onDoublePress = (): void => {
        console.log("Double press detected");
    };
    const onTriplePress = (): void => {
        console.log("Triple press detected");
    };
    const onLongPress = (): void => {
        console.log("Long press detected");
    };

    // Timing config
    const MULTI_PRESS_THRESHOLD = 300; // ms between presses
    const LONG_PRESS_THRESHOLD = 500; // ms to trigger long press

    // Tracking variables
    let pressCount = 0;
    let lastPressTime = 0;
    let pressTimer: NodeJS.Timeout | null = null;
    let keyDownTime: number | null = null;
    let longPressTriggered = false;
    let keyIsDown = false;
    let releaseTimer: NodeJS.Timeout | null = null;

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    process.stdin.on("keypress", (_chunk: string, key: readline.Key) => {
        if (key && key.name === "q") exit(apps);

        if (key && key.name === "space") {
            // Ignore repeats while held down
            if (keyIsDown) return;
            keyIsDown = true;

            const now = Date.now();

            // Track press count only if we aren't in a long press state
            if (!longPressTriggered) {
                if (now - lastPressTime <= MULTI_PRESS_THRESHOLD) {
                    pressCount++;
                } else {
                    pressCount = 1;
                }
                lastPressTime = now;
            }

            // Start tracking hold time
            keyDownTime = now;
            longPressTriggered = false;

            // Reset multi-press timer
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = setTimeout(() => {
                // Only fire if no long press happened
                if (!longPressTriggered) {
                    if (pressCount === 1) {
                        const app = apps[currentAppNumber];
                        if (app.overrideDefaultPressOn && app.handlePress) {
                            app.handlePress();
                        } else {
                            defaultOnPress();
                        }
                    } else if (pressCount === 2) {
                        onDoublePress();
                    } else if (pressCount === 3) {
                        onTriplePress();
                    }
                }
                pressCount = 0; // Reset so triple doesn't become double/single
            }, MULTI_PRESS_THRESHOLD);
        }
    });

    // Simulated key release & long press detection
    process.stdin.on("data", (data: Buffer) => {
        if (data.toString() === " ") {
            if (releaseTimer) clearTimeout(releaseTimer);
            releaseTimer = setTimeout(() => {
                if (keyIsDown) {
                    const now = Date.now();
                    const holdDuration = keyDownTime ? now - keyDownTime : 0;

                    // Long press fires only if held long enough AND no short-press was already decided
                    if (holdDuration >= LONG_PRESS_THRESHOLD && !longPressTriggered) {
                        longPressTriggered = true;
                        if (pressTimer) clearTimeout(pressTimer); // Cancel multi-press detection
                        pressCount = 0;
                        onLongPress();
                    }

                    keyIsDown = false;
                    keyDownTime = null;
                }
            }, 50); // Simulated keyup after small pause
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
