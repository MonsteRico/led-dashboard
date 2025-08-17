import { basename } from "path";
import sharp, { type Sharp } from "sharp";

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

export async function sharpToUint8Array(sharpImage: Sharp): Promise<Uint8Array> {
    const { width, height } = await sharpImage.metadata();
    console.log("SHARP IMAGE TO UINT8 ARRAY");
    console.log("WIDTH", width);
    console.log("HEIGHT", height);
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
            const i = (py * width + px) * 4;

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
