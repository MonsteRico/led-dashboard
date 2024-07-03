import { GpioMapping, LedMatrix, RuntimeFlag } from "rpi-led-matrix";
import { Settings } from "luxon";
import readline from "readline";
import DevMatrix from "./DevMatrix";
import { fonts } from "./preload";
import Weather from "./apps/weather";
import Clock from "./apps/clock";
import Test from "./apps/test";
import type App from "./apps/app";

// Configure the time zone
Settings.defaultZone = "America/Indianapolis";

(async () => {
    // Initialize the matrix
    let matrix = new DevMatrix(
        {
            ...LedMatrix.defaultMatrixOptions(),
            cols: 64,
            hardwareMapping: GpioMapping.AdafruitHatPwm,
            limitRefreshRateHz: 100,
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
    const apps: App[] = [new Clock(matrix), new Weather(matrix), new Test(matrix)];

    let currentApp = 0;

    // Handle keypresses for switching apps and exiting
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.on("keypress", (chunk, key) => {
        if (key && key.name == "q") process.exit();
        if (key && key.name == "space") {
            currentApp = (currentApp + 1) % apps.length;
            console.log("Switching to app " + currentApp);
            apps[currentApp].onStart?.();
        }
    });

    // Update the matrix every frame
    matrix.afterSync((mat, dt, t) => {
        matrix.clear();
        apps[currentApp].update();
        setTimeout(() => matrix.sync(), 0);
    });

    // Start the matrix
    matrix.sync();
})();
