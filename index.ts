import { Font, GpioMapping, LedMatrix, MuxType, RowAddressType, RuntimeFlag, ScanMode } from "rpi-led-matrix";
import type { FontInstance, LedMatrixInstance } from "rpi-led-matrix/dist/types";
import http from "http";
import { DateTime } from "luxon";
import { basename } from "path";
import readline from "readline";
import DevMatrix from "./DevMatrix";
import Color from "color";
import { glob } from "glob";
import { registerFont } from "canvas";
import DevFont from "./DevFont";
import { Server } from "socket.io";
const MATRIX_ENABLED = false;

(async () => {
	const fontList = (await glob("fonts/*.bdf"))
		.filter((path) => !Number.isSafeInteger(basename(path, ".bdf")[0]))
		.map((path) => {
			const font = new DevFont(path, MATRIX_ENABLED);
			return font;
		});
	if (fontList.length < 1) {
		throw new Error(`No fonts were loaded!`);
	}
	type FontMap = { [name: string]: DevFont };
	const fonts: FontMap = fontList.reduce((map, font) => ({ ...map, [font.name()]: font }), {});

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
			gpioSlowdown: 0,
		},
		MATRIX_ENABLED
	);

	matrix.font(fonts["7x13"]);
	matrix.clear().sync();

	const httpServer = http
		.createServer(function (req, res) {
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(
				'<style>html { background: black;}</style><script src="/socket.io/socket.io.js"></script><script>  var socket = io();  socket.on("update", function(data) {    document.getElementById("img").src = data;  }); document.addEventListener("keypress", (event) => {event.preventDefault(); if (event.key == " ") {socket.emit("space", "space"); console.log("space");}})</script>' +
					'<img id="img" style="border: 1px solid black;" src="' +
					matrix.canvas.toDataURL() +
					'" />'
			);
		})
		.listen(3000, function () {
			console.log("Server started on port 3000");
		});

	const socket = new Server(httpServer);

	class Weather {
		static async update() {
			matrix.clear();
			await matrix.drawImage("spaceManatee.png", 46, 1);
			await matrix.drawImage("storm.png", 0 + 8, 4);
			matrix.font(fonts["7x13"]);
			matrix.fgColor(new Color("#111111"));
			await matrix.drawText("72°F", 18 + 8, 6);
			matrix.font(fonts["6x9"]);
			await matrix.drawText(Clock.time.toFormat("EEE LLL d"), 2, 21, 0);
		}
	}

	class Clock {
		static time: DateTime;
		static async update() {
			this.time = DateTime.now();
			matrix.clear();
			await matrix.drawImage("moon.png", 0, 0);
			matrix.fgColor(new Color("#000000"));
			matrix.font(fonts["spleen-8x16"]);
			await matrix.drawText(Clock.time.toLocaleString(DateTime.TIME_SIMPLE), 0, 8, 0);
			matrix.font(fonts["6x9"]);
			matrix.fgColor(new Color("#ffffff"));
			await matrix.drawText(Clock.time.toFormat("EEE LLL d"), 2, 21, 0);
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

	socket.on("connection", (socket) => {
		socket.on("space", () => {
			currentApp = (currentApp + 1) % apps.length;
			console.log("Switching to app " + currentApp);
		});
	});

	matrix.afterSync(async () => {
		matrix.clear();
		await apps[currentApp].update();
		matrix.grid();
		socket.emit("update", matrix.canvas.toDataURL());
		setTimeout(() => matrix.sync(), 1000);
	});

	matrix.sync();
})();
