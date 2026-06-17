import { describe, expect, it } from "vitest";
import { imageAssetPath, isDrawerImageAssetPath, sanitizeAssetFilename } from "../assets";

describe("drawer assets", () => {
  it("sanitizes image filenames", () => {
    expect(sanitizeAssetFilename("/tmp/My Image!.png")).toBe("My-Image-.png");
    expect(imageAssetPath("chart 1.jpg")).toBe("assets/images/chart-1.jpg");
  });

  it("recognizes drawer-local image paths", () => {
    expect(isDrawerImageAssetPath("assets/images/chart.png")).toBe(true);
    expect(isDrawerImageAssetPath("../chart.png")).toBe(false);
  });
});
