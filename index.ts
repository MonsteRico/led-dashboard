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
import { checkWiFiConnection } from "./wifi";
import Wifi from "./apps/wifiApp";

// Configure the time zone
Settings.defaultZone = "America/Indianapolis";

(async () => {
    const wifiConnected = await checkWiFiConnection();
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
            dropPrivileges: wifiConnected ? RuntimeFlag.On : RuntimeFlag.Off,
            gpioSlowdown: 3,
        },
    );

    // Set default font and clear the matrix
    matrix.font(fonts["7x13"]);
    matrix.clear().sync();

    // Apps array from apps folder
    const apps: App[] = [];

    if (wifiConnected) {
        apps.push(new Clock(matrix));
        apps.push(new Weather(matrix));
        apps.push(new Test(matrix));
        apps.push(new Website(matrix));
    } else {
        apps.push(new Wifi(matrix));
    }


    // Initialize apps if they have an initialize method
    for (const app of apps) {
        await app.initialize?.();
    }

    let currentApp = 0;

    // Handle keypresses for switching apps and exiting
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.on("keypress", (chunk, key) => {
        if (key && key.name == "q") exit(apps);
        if (key && key.name == "space") {
            currentApp = (currentApp + 1) % apps.length;
            console.log("Switching to app " + currentApp);
            // onStart is called when the app is switched to (usually to force an update)
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
