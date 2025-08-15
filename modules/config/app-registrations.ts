import { appRegistry } from "@/modules/config/app-registry";
import type DevMatrix from "@/DevMatrix";
import Clock from "@/apps/clock";
import Weather from "@/apps/weather";
import Test from "@/apps/test";
import Website from "@/apps/website";
import Spotify from "@/apps/spotify";

// Register all apps here - this is the ONLY place you need to define apps
export function registerAllApps(): void {
    // Clock App
    appRegistry.registerApp({
        name: "Clock",
        className: "Clock",
        enabled: true,
        factory: (matrix: DevMatrix) => new Clock(matrix),
    });

    // Weather App
    appRegistry.registerApp({
        name: "Weather",
        className: "Weather",
        enabled: true,
        factory: (matrix: DevMatrix) => new Weather(matrix),
    });

    // Test App
    appRegistry.registerApp({
        name: "Test",
        className: "Test",
        enabled: true,
        factory: (matrix: DevMatrix) => new Test(matrix),
    });

    // Website App
    appRegistry.registerApp({
        name: "Website",
        className: "Website",
        enabled: true,
        factory: (matrix: DevMatrix) => new Website(matrix),
    });

    // Spotify App
    appRegistry.registerApp({
        name: "Spotify",
        className: "Spotify",
        enabled: true,
        factory: (matrix: DevMatrix) => new Spotify(matrix),
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
