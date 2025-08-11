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

    const defaultPress = () => {
        currentAppNumber = (currentAppNumber + 1) % apps.length;
        console.log("Switching to app " + currentAppNumber);
        // onStart is called when the app is switched to (usually to force an update)
        apps[currentAppNumber].onStart?.();
    };

    // Enhanced keyboard handling variables
    let spacebarPressCount = 0;
    let spacebarLastPressTime = 0;
    let spacebarPressStartTime = 0;
    let spacebarLongPressTimeout: NodeJS.Timeout | null = null;
    let spacebarDoublePressTimeout: NodeJS.Timeout | null = null;
    let spacebarTriplePressTimeout: NodeJS.Timeout | null = null;

    // Constants for timing (in milliseconds)
    const DOUBLE_PRESS_DELAY = 300; // Time window for double press detection
    const TRIPLE_PRESS_DELAY = 300; // Time window for triple press detection
    const LONG_PRESS_DURATION = 2000; // Duration for long press detection

    // Handle keypresses for switching apps and exiting
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.on("keypress", (chunk, key) => {
        if (key && key.name == "q") exit(apps);

        // Handle arrow keys for rotation
        if (key && key.name == "right") {
            console.log("Right arrow pressed - calling app.handleRotateRight");
            const app = apps[currentAppNumber];
            if (app.handleRotateRight) {
                app.handleRotateRight();
            }
        }

        if (key && key.name == "left") {
            console.log("Left arrow pressed - calling app.handleRotateLeft");
            const app = apps[currentAppNumber];
            if (app.handleRotateLeft) {
                app.handleRotateLeft();
            }
        }

        // Handle spacebar with enhanced functionality
        if (key && key.name == "space") {
            const currentTime = Date.now();
            const app = apps[currentAppNumber];

            // Handle spacebar press down
            if (key.ctrl === false && key.meta === false && key.shift === false) {
                spacebarPressCount++;
                spacebarLastPressTime = currentTime;

                // Start long press detection
                spacebarPressStartTime = currentTime;
                spacebarLongPressTimeout = setTimeout(() => {
                    console.log("Long press detected - calling app.handleLongPress");
                    if (app.handleLongPress) {
                        app.handleLongPress();
                    }
                    // Reset press count after long press
                    spacebarPressCount = 0;
                }, LONG_PRESS_DURATION);

                // Handle double press detection
                if (spacebarDoublePressTimeout) {
                    clearTimeout(spacebarDoublePressTimeout);
                }

                spacebarDoublePressTimeout = setTimeout(() => {
                    if (spacebarPressCount === 2) {
                        console.log("Double press detected - calling app.handleDoublePress");
                        if (app.handleDoublePress) {
                            app.handleDoublePress();
                        }
                    } else if (spacebarPressCount === 3) {
                        console.log("Triple press detected - calling app.handleTriplePress");
                        if (app.handleTriplePress) {
                            app.handleTriplePress();
                        }
                    } else if (spacebarPressCount === 1) {
                        // Single press - check if app overrides default behavior
                        if (app.overrideDefaultPressOn && app.handlePress) {
                            console.log("Single press detected - calling app.handlePress (override)");
                            app.handlePress();
                        } else {
                            console.log("Single press detected - calling defaultPress (switch apps)");
                            defaultPress();
                        }
                    }
                    // Reset press count
                    spacebarPressCount = 0;
                }, DOUBLE_PRESS_DELAY);
            }

            // Handle spacebar release (for future physical button implementation)
            // Note: This will be useful when transitioning to physical button + potentiometer
            // The potentiometer can be used for rotation (left/right) and the button for press actions
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
