import { glob } from "glob";
import { basename } from "path";
import { Font, type FontInstance } from "rpi-led-matrix";
import preloadImages from "./preloadImages";

// Get all .bdf fonts from fonts folder
const fontList = (await glob("fonts/*.bdf"))
    .filter((path) => !Number.isSafeInteger(basename(path, ".bdf")[0]))
    .map((path) => {
        // Get the name of the font from the path and create a new Font instance
        const name = basename(path, ".bdf");
        const font = new Font(name, path);
        return font;
    });

// If no fonts were found, throw an error
if (fontList.length < 1) {
    throw new Error(`No fonts were loaded!`);
}

// Create a map of font names to Font instances
type FontMap = { [name: string]: FontInstance };
export const fonts: FontMap = fontList.reduce((map, font) => ({ ...map, [font.name()]: font }), {});

// Preload images, they are in images folder and can be .png or .jpg and can be in subfolders
const globImageFiles = await glob("images/**/*.{png,jpg}");
export const images = await preloadImages(globImageFiles);
