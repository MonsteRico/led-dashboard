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
/**
 * Represents a color with its count.
 */
interface ColorCount {
  color: Color;
  count: number;
}
/**
 * The output structure for the top three colors.
 */
interface TopThreeColors {
  primary: Color;
  secondary: Color;
  tertiary: Color;
}

/**
 * Finds the top three dominant colors in a 32x32 image pixel data array.
 * @param pixelData A Uint8Array containing the pixel data (32x32 pixels, 4 channels: R, G, B, Alpha).
 * @returns An object with the top three dominant colors.
 */
export async function getTopThreeColors(pixelData: Uint8Array): Promise<TopThreeColors> {
  const colorMap = new Map<string, number>();
  const totalPixels = 32 * 32;

  // 1. Count each unique color in the pixel data.
  // The image is 32x32 with 4 channels (RGBA), so each pixel is 4 bytes.
  for (let i = 0; i < totalPixels * 4; i += 4) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];

    // Ignore transparent pixels based on the alpha channel.
    if (pixelData[i + 3] === 0) {
      continue;
    }

    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  // 2. Group similar colors to account for "leniency".
  const colorCounts: ColorCount[] = Array.from(colorMap.entries()).map(([key, count]) => {
    const [r, g, b] = key.split(',').map(Number);
    return { color: Color({ r, g, b }), count };
  });

  const groupedColors: Color[][] = [];
  const tolerance = 20; // A reasonable tolerance for color similarity.

  for (const { color, count } of colorCounts) {
    let assignedToGroup = false;
    for (const group of groupedColors) {
      // Use the first color of the group as the representative.
      const representativeColor = group[0];
      const r_dist = representativeColor.red() - color.red();
      const g_dist = representativeColor.green() - color.green();
      const b_dist = representativeColor.blue() - color.blue();
      const distance = Math.sqrt(r_dist * r_dist + g_dist * g_dist + b_dist * b_dist);

      if (distance <= tolerance) {
        // Add the color to the group a number of times equal to its count.
        for (let i = 0; i < count; i++) {
          group.push(color);
        }
        assignedToGroup = true;
        break;
      }
    }
    if (!assignedToGroup) {
      // Create a new group for this color and add it based on its count.
      const newGroup: Color[] = [];
      for (let i = 0; i < count; i++) {
        newGroup.push(color);
      }
      groupedColors.push(newGroup);
    }
  }

  // 3. Find the average color of the top three largest groups.
  groupedColors.sort((a, b) => b.length - a.length);

  const topThreeColors: Color[] = [];
  for (let i = 0; i < Math.min(3, groupedColors.length); i++) {
    const group = groupedColors[i];
    if (group.length > 0) {
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;

      for (const c of group) {
        totalR += c.red();
        totalG += c.green();
        totalB += c.blue();
      }

      const avgR = Math.max(0, Math.min(255, Math.round(totalR / group.length)));
      const avgG = Math.max(0, Math.min(255, Math.round(totalG / group.length)));
      const avgB = Math.max(0, Math.min(255, Math.round(totalB / group.length)));
      topThreeColors.push(Color({ r: avgR, g: avgG, b: avgB }));
    }
  }

  const primary = topThreeColors[0] || Color("#ffffff");
  const secondary = topThreeColors[1] || Color("#ffffff");
  const tertiary = topThreeColors[2] || Color("#ffffff");

  return { primary, secondary, tertiary };
}