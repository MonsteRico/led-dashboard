import { Font, GpioMapping, MuxType, RowAddressType, RuntimeFlag, ScanMode, type FontInstance } from "rpi-led-matrix";
import { DateTime, Settings } from "luxon";
import { basename } from "path";
import readline from "readline";
import DevMatrix from "./DevMatrix";
import Color from "color";
import { glob } from "glob";
import preloadImages from "./preloadImages";
import OpenWeatherMap from "openweathermap-ts";

const openWeather = new OpenWeatherMap({
    apiKey: process.env.OPENWEATHER_API_KEY as string,
});

console.log(openWeather.getCurrentWeatherByCityName({ cityName: "Carmel", state: "IN" }));

// Configure the time zone
Settings.defaultZone = "America/Indianapolis";

(async () => {
    const fontList = (await glob("fonts/*.bdf"))
        .filter((path) => !Number.isSafeInteger(basename(path, ".bdf")[0]))
        .map((path) => {
            const name = basename(path, ".bdf");
            const font = new Font(name, path);
            return font;
        });
    if (fontList.length < 1) {
        throw new Error(`No fonts were loaded!`);
    }
    type FontMap = { [name: string]: FontInstance };
    const fonts: FontMap = fontList.reduce((map, font) => ({ ...map, [font.name()]: font }), {});

    const images = await preloadImages(["./spaceManatee.png", "./storm.png"]);

    let matrix = new DevMatrix(
        {
            brightness: 100,
            chainLength: 1,
            cols: 64,
            disableHardwarePulsing: false,
            hardwareMapping: GpioMapping.AdafruitHatPwm,
            inverseColors: false,
            ledRgbSequence: "RGB",
            limitRefreshRateHz: 100,
            multiplexing: MuxType.Direct,
            panelType: "",
            parallel: 1,
            pixelMapperConfig: "",
            pwmBits: 11,
            pwmDitherBits: 0,
            pwmLsbNanoseconds: 130,
            rowAddressType: RowAddressType.Direct,
            rows: 32,
            scanMode: ScanMode.Interlaced,
            showRefreshRate: true,
        },
        {
            daemon: RuntimeFlag.Off,
            doGpioInit: true,
            dropPrivileges: RuntimeFlag.Off,
            gpioSlowdown: 3,
        },
    );

    matrix.font(fonts["7x13"]);
    matrix.clear().sync();

    class Test {
        static update() {
            matrix.fgColor(new Color("#ffff00"));
            matrix.fill();
            matrix.fgColor(new Color("#00ff00"));
            matrix.setPixel(0, 0);
            matrix.setPixel(matrix.width() - 1, 0);
            matrix.setPixel(0, matrix.height() - 1);
            matrix.setPixel(matrix.width() - 1, matrix.height() - 1);
        }
    }

    class Weather {
        static async update() {
            matrix.drawImage(images["spaceManatee.png"], matrix.width() - 18, 1);
            matrix.drawImage(images["storm.png"], 1, 4);
            matrix.font(fonts["7x13"]);
            matrix.drawText("72°F", 18, 6, { color: new Color("#888888"), rightShadow: true });
            matrix.font(fonts["6x9"]);
            matrix.drawText(Clock.time.toFormat("EEE LLL d"), 2, 21, { color: new Color("#888888"), rightShadow: true });
        }
    }

    class Clock {
        static time: DateTime;
        static update() {
            this.time = DateTime.now();
            // await matrix.drawImage("moon.png", 0, 0);
            matrix.fgColor(new Color("#ff0000"));
            matrix.font(fonts["spleen-8x16"]);
            matrix.drawText(Clock.time.toLocaleString(DateTime.TIME_SIMPLE), 0, 8);
            matrix.font(fonts["6x9"]);
            matrix.fgColor(new Color("#00ff00"));
            matrix.drawText(Clock.time.toFormat("EEE LLL d"), 2, 21);
        }
    }

    const apps = [Clock, Weather, Test];

    enum App {
        CLOCK = 0,
        WEATHER = 1,
        TEST = 2,
    }
    let currentApp = App.TEST;

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.on("keypress", (chunk, key) => {
        if (key && key.name == "q") process.exit();
        if (key && key.name == "space") {
            currentApp = (currentApp + 1) % apps.length;
            console.log("Switching to app " + currentApp);
        }
    });

    matrix.afterSync((mat, dt, t) => {
        matrix.clear();
        apps[currentApp].update();
        setTimeout(() => matrix.sync(), 0);
    });

    matrix.sync();
})();
