import { Font, GpioMapping, LedMatrix, MuxType, RowAddressType, RuntimeFlag, ScanMode, type FontInstance } from "rpi-led-matrix";
import { DateTime } from "luxon";
import { basename } from "path";
import readline from "readline";
import DevMatrix from "./DevMatrix";
import Color from "color";
import { glob } from "glob";

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
	console.log(fonts);
	let matrix = new DevMatrix(
	{
			brightness: 100,
			chainLength: 1,
			cols: 64,
			disableHardwarePulsing: false,
			hardwareMapping: GpioMapping.AdafruitHatPwm,
			inverseColors: false,
			ledRgbSequence: "RGB",
			limitRefreshRateHz: 120,
			multiplexing: MuxType.Stripe,
			panelType: "",
			parallel: 1,
			pixelMapperConfig: "",
			pwmBits: 11,
			pwmDitherBits: 0,
			pwmLsbNanoseconds: 130,
			rowAddressType: RowAddressType.Direct,
			rows: 16,
			scanMode: ScanMode.Progressive,
			showRefreshRate: true,
		},
		{
			daemon: RuntimeFlag.Off,
			doGpioInit: true,
			dropPrivileges: RuntimeFlag.On,
			gpioSlowdown: 2,
		}	);

	matrix.font(fonts["7x13"]);
	matrix.clear().sync();

	class Test {
		static update() {
			matrix.fgColor(new Color("#ff0000"));
			matrix.fill();
			matrix.fgColor(new Color("#00ff00"));
			matrix.setPixel(0,0);
			matrix.setPixel(matrix.width(), 0);
			matrix.setPixel(0, matrix.height());
			matrix.setPixel(matrix.width(), matrix.height());
		}
	}

	class Weather {
		static update() {
			// await matrix.drawImage("spaceManatee.png", 46, 1);
			// await matrix.drawImage("storm.png", 0 + 8, 4);
			matrix.font(fonts["7x13"]);
			matrix.fgColor(new Color("#111111"));
			matrix.drawText("72°F", 18 + 8, 6);
			matrix.font(fonts["6x9"]);
			matrix.drawText(Clock.time.toFormat("EEE LLL d"), 2, 21, 0);
		}
	}

	class Clock {
		static time: DateTime;
		static update() {
			this.time = DateTime.now();
			// await matrix.drawImage("moon.png", 0, 0);
			matrix.fgColor(new Color("#ff0000"));
			matrix.font(fonts["spleen-8x16"]);
			matrix.drawText(Clock.time.toLocaleString(DateTime.TIME_SIMPLE), 0, 8, 0);
			matrix.font(fonts["6x9"]);
			matrix.fgColor(new Color("#00ff00"));
			matrix.drawText(Clock.time.toFormat("EEE LLL d"), 2, 21, 0);
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