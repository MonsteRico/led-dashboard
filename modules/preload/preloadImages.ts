import Color from "color";
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

export async function topColors(
    image: Image,
    colorDistanceThreshold: number = 32
): Promise<{ primary: Color; secondary: Color; tertiary: Color }> {
    // Helper to compute Euclidean distance between two colors
    function colorDistance(a: [number, number, number], b: [number, number, number]): number {
        const dr = a[0] - b[0];
        const dg = a[1] - b[1];
        const db = a[2] - b[2];
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    const clusters: { center: [number, number, number]; sum: [number, number, number]; count: number }[] = [];

    for (let i = 0; i < image.data.length; i += 3) {
        const r = image.data[i];
        const g = image.data[i + 1];
        const b = image.data[i + 2];
        let found = false;
        for (const cluster of clusters) {
            if (colorDistance([r, g, b], cluster.center) <= colorDistanceThreshold) {
                // Add to this cluster
                cluster.sum[0] += r;
                cluster.sum[1] += g;
                cluster.sum[2] += b;
                cluster.count += 1;
                found = true;
                break;
            }
        }
        if (!found) {
            clusters.push({
                center: [r, g, b],
                sum: [r, g, b],
                count: 1,
            });
        }
    }

    // Compute average color for each cluster
    const averagedClusters = clusters.map((cluster) => {
        const avg: [number, number, number] = [
            Math.round(cluster.sum[0] / cluster.count),
            Math.round(cluster.sum[1] / cluster.count),
            Math.round(cluster.sum[2] / cluster.count),
        ];
        return {
            color: avg,
            count: cluster.count,
        };
    });

    // Sort clusters by count descending
    averagedClusters.sort((a, b) => b.count - a.count);

    // Fallback to black if not enough colors
    const getColor = (idx: number) =>
        averagedClusters[idx]
            ? new Color({ r: averagedClusters[idx].color[0], g: averagedClusters[idx].color[1], b: averagedClusters[idx].color[2] })
            : new Color("#ffffff");

    return {
        primary: getColor(0),
        secondary: getColor(1),
        tertiary: getColor(2),
    };
}