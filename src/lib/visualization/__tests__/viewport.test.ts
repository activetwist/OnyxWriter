import { describe, expect, it } from "vitest";
import { DEFAULT_VIEWPORT, fitViewport, fitViewportToBounds, panViewport, zoomViewport } from "../viewport";

describe("viewport transforms", () => {
  it("clamps zoom and preserves pan", () => {
    expect(zoomViewport({ scale: 2, x: 10, y: 20 }, 10)).toEqual({ scale: 4, x: 10, y: 20 });
    expect(zoomViewport({ scale: 1, x: 3, y: 4 }, 0)).toEqual({ scale: 0.25, x: 3, y: 4 });
  });

  it("pans by deltas", () => {
    expect(panViewport({ scale: 1, x: 4, y: 8 }, -2, 5)).toEqual({ scale: 1, x: 2, y: 13 });
  });

  it("fits content into a viewport and falls back for invalid dimensions", () => {
    expect(fitViewport(800, 400, 400, 400)).toMatchObject({ scale: 0.46, x: 16, y: 108 });
    expect(fitViewport(0, 400, 400, 400)).toBe(DEFAULT_VIEWPORT);
  });

  it("fits translated graph bounds into a viewport", () => {
    expect(fitViewportToBounds({ minX: -100, minY: 50, width: 400, height: 200 }, 800, 500)).toEqual({
      scale: 1.8,
      x: 220,
      y: -20,
    });
    expect(fitViewportToBounds({ minX: 0, minY: 0, width: 0, height: 200 }, 800, 500)).toBe(DEFAULT_VIEWPORT);
  });
});
