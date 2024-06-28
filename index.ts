import { Font, GpioMapping, HorizontalAlignment, LayoutUtils, LedMatrix, MuxType, RowAddressType, RuntimeFlag, ScanMode, VerticalAlignment, type FontInstance } from "rpi-led-matrix";
import { DateTime } from "luxon";
import { basename } from "path";
import readline from "readline";
import DevMatrix from "./DevMatrix";
import Color from "color";
import { glob } from "glob";
function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}
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
	Object.keys(fonts).map(font => console.log(fonts[font].name()));
	let matrix = new DevMatrix(
		{
			brightness: 100,
			chainLength: 1,
			cols: 64,
			disableHardwarePulsing: false,
			hardwareMapping: GpioMapping.AdafruitHatPwm,
			inverseColors: false,
			ledRgbSequence: "RGB",
			limitRefreshRateHz: 0,
			multiplexing: MuxType.Direct,
			panelType: "",
			parallel: 1,
			pixelMapperConfig: "",
			pwmBits: 11,
			pwmDitherBits: 0,
			pwmLsbNanoseconds: 130,
			rowAddressType: RowAddressType.Direct,
			rows: 32,
			scanMode: ScanMode.Progressive,
			showRefreshRate: false,
		},
		{
			daemon: RuntimeFlag.Off,
			doGpioInit: true,
			dropPrivileges: RuntimeFlag.On,
			gpioSlowdown: 1,
		}	);


		matrix.clear().sync();

	class Weather {
		static update() {
			matrix.clear();
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
			matrix.clear();
			// await matrix.drawImage("moon.png", 0, 0);
			matrix.fgColor(new Color("#000000"));
			matrix.font(fonts["spleen-8x16"]);
			matrix.drawText(Clock.time.toLocaleString(DateTime.TIME_SIMPLE), 0, 8, 0);
			matrix.fgColor(new Color("#ffffff"));

			const lines = LayoutUtils.textToLines(
				fonts["6x9"],
				matrix.width(),
				Clock.time.toFormat("EEE LLL d"),
			);

			LayoutUtils.linesToMappedGlyphs(
				lines,
				fonts["6x9"].height(),
				matrix.width(),
				matrix.height(),
				HorizontalAlignment.Center,
				VerticalAlignment.Bottom
			).map(glyph => {
				matrix.drawText(glyph.char, glyph.x, glyph.y);
			});
		}
	}

	const apps = [Clock, Weather];

	enum App {
		CLOCK = 0,
		WEATHER = 1,
	}
	let currentApp = App.CLOCK;

	readline.emitKeypressEvents(process.stdin);
	if (process.stdin.isTTY) process.stdin.setRawMode(true);
	process.stdin.on("keypress", (chunk, key) => {
		if (key && key.name == "q") process.exit();
		if (key && key.name == "space") {
			currentApp = (currentApp + 1) % apps.length;
			console.log("Switching to app " + currentApp);
		}
	});
	matrix.fgColor(new Color("#000000"));
	matrix.drawText("Hello World", 0, 0).sync();
	await delay(3000);
	matrix.fgColor(new Color("#ffffff"));
	matrix.clear().sync();
	matrix.drawText("Hello World x2", 0, 0).sync();
	await delay(3000);
	matrix.fgColor(new Color("#ff0000"));
	matrix.clear().sync();
	matrix.drawText("Hello World x3", 0, 0).sync();
	await delay(3000);

})();