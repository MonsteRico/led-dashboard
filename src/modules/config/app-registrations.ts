import { appRegistry } from "@/modules/config/app-registry";
import type DevMatrix from "@/DevMatrix";
import Clock from "@/apps/clock";
import Weather from "@/apps/weather";
import Test from "@/apps/test";
import Spotify from "@/apps/spotify";
import Canvas from "@/apps/canvas";
import I2CTest from "@/apps/i2cTest";

// Register all apps here - this is the ONLY place you need to define apps
export async function registerAllApps(): Promise<void> {
	// Clock App
	await appRegistry.registerApp({
		name: "Clock",
		className: "Clock",
		enabled: true,
		factory: (matrix: DevMatrix) => new Clock(matrix),
	});

	// Weather App
	await appRegistry.registerApp({
		name: "Weather",
		className: "Weather",
		enabled: true,
		factory: (matrix: DevMatrix) => new Weather(matrix),
	});

	// Test App
	await appRegistry.registerApp({
		name: "Test",
		className: "Test",
		enabled: true,
		factory: (matrix: DevMatrix) => new Test(matrix),
	});

	// Website App
	await appRegistry.registerApp({
		name: "Canvas",
		className: "Canvas",
		enabled: true,
		factory: (matrix: DevMatrix) => new Canvas(matrix),
		requiredEnvVars: ["LED_DASHBOARD_WEB_KEY"],
	});

	// Spotify App
	await appRegistry.registerApp({
		name: "Spotify",
		className: "Spotify",
		enabled: true,
		factory: (matrix: DevMatrix) => new Spotify(matrix),
		requiredEnvVars: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
	});

	// I2C Test App
	await appRegistry.registerApp({
		name: "I2C Test",
		className: "I2CTest",
		enabled: true,
		factory: (matrix: DevMatrix) => new I2CTest(matrix),
	});
}

// To add a new app, simply add it here:
/*
appRegistry.registerApp({
    name: "Your New App",
    className: "YourNewApp",
    enabled: true,
    factory: (matrix: DevMatrix) => new YourNewApp(matrix)
});
*/
