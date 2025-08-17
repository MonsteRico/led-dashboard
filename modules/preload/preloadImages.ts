import Color from "color";
import { basename } from "path";
import sharp, { type Sharp } from "sharp";
import { getPaletteFromURL } from "color-thief-node";

export type Image = {
    width: number;
    height: number;
    data: Uint8Array;
};

export default async function preloadImages(imagePaths: string[]): Promise<Record<string, Image>> {
    const imagesObject: Record<string, Image> = {};
    const promises = imagePaths.map(async (path) => {
        const sharpImage = await sharp(path);
        const { width, height } = await sharpImage.metadata();
        if (!width || !height) {
            throw new Error("Invalid image dimensions");
        }
        const imageBuffer = await sharpToUint8Array(sharpImage);

        // get the filename
        const filename = basename(path);
        imagesObject[filename] = {
            width,
            height,
            data: imageBuffer,
        };
        return imageBuffer;
    });
    await Promise.all(promises);
    return imagesObject;
}

export async function sharpToUint8Array(sharpImage: Sharp, hasAlpha: boolean = true): Promise<Uint8Array> {
    const { width, height } = await sharpImage.metadata();
    if (!width || !height) {
        throw new Error("Invalid image dimensions");
    }
    const imageBuffer = await sharpImage
        .raw() // Get raw pixel data
        .toBuffer(); // Convert to Buffer
    const rgbArray: Uint8Array = new Uint8Array(width * height * 3);
    // Loop through each pixel in the image
    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            // Calculate the index of the pixel in the image data
            const i = (py * width + px) * (hasAlpha ? 4 : 3);

            // Extract the RGB values from the image data
            const r = imageBuffer[i];
            const g = imageBuffer[i + 1];
            const b = imageBuffer[i + 2];

            // set the pixel in the rgb array (3 bytes per pixel)
            const j = (py * width + px) * 3;

            rgbArray[j] = r;
            rgbArray[j + 1] = g;
            rgbArray[j + 2] = b;
        }
    }
    return rgbArray;
}

/**
 * Calculates the Euclidean distance between two RGB colors.
 * @param color1 The first RGB color.
 * @param color2 The second RGB color.
 * @returns The Euclidean distance.
 */
function colorDistance(color1: Color, color2: Color): number {
    return Math.sqrt(
        Math.pow(color1.red() - color2.red(), 2) +
            Math.pow(color1.green() - color2.green(), 2) +
            Math.pow(color1.blue() - color2.blue(), 2),
    );
}

/**
 * Finds the top three dominant colors in a pixel data array with some leniency.
 * @param pixelData A Uint8Array containing the pixel data.
 * @param width The width of the image.
 * @param height The height of the image.
 * @param tolerance The tolerance for color similarity (e.g., 50 for a lenient match).
 * @returns An array of the top three dominant colors in RGB format.
 */
export async function getTopThreeColors(imageUrl: string, tolerance: number = 50): Promise<{ primary: Color; secondary: Color; tertiary: Color }> {
    // Use a library to get a palette of colors, which is faster than manual iteration.
    const palette = await getPaletteFromURL(imageUrl, 10); // Get top 10 colors to account for variations

    // Convert the palette to RGB objects for easier processing
    const rgbPalette: Color[] = palette.map(([r, g, b]) => new Color({ r, g, b }));

    // Group similar colors within the tolerance
    const groupedColors: Color[][] = [];
    rgbPalette.forEach((color) => {
        let foundGroup = false;
        for (const group of groupedColors) {
            // Compare the color to the first color of each group
            if (colorDistance(color, group[0]) < tolerance) {
                group.push(color);
                foundGroup = true;
                break;
            }
        }
        if (!foundGroup) {
            groupedColors.push([color]);
        }
    });

    // Sort groups by size to find the dominant colors
    groupedColors.sort((a, b) => b.length - a.length);

    // Take the top three groups and calculate the average color of each group
    const dominantColors: Color[] = [];
    for (let i = 0; i < Math.min(3, groupedColors.length); i++) {
        const group = groupedColors[i];
        const avgColor = group.reduce(
            (acc, c) => {
                acc.r += c.red();
                acc.g += c.green();
                acc.b += c.blue();
                return acc;
            },
            { r: 0, g: 0, b: 0 },
        );

        dominantColors.push(
            new Color({
                r: Math.round(avgColor.r / group.length),
                g: Math.round(avgColor.g / group.length),
                b: Math.round(avgColor.b / group.length),
            }),
        );
    }

    return {
        primary: dominantColors[0],
        secondary: dominantColors[1],
        tertiary: dominantColors[2],
    };
}
