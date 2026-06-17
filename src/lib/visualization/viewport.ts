export interface ViewportTransform {
  scale: number;
  x: number;
  y: number;
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export const DEFAULT_VIEWPORT: ViewportTransform = { scale: 1, x: 0, y: 0 };

export function zoomViewport(viewport: ViewportTransform, factor: number): ViewportTransform {
  return {
    ...viewport,
    scale: clampScale(viewport.scale * factor),
  };
}

export function panViewport(viewport: ViewportTransform, dx: number, dy: number): ViewportTransform {
  return {
    ...viewport,
    x: viewport.x + dx,
    y: viewport.y + dy,
  };
}

export function fitViewport(contentWidth: number, contentHeight: number, viewportWidth: number, viewportHeight: number): ViewportTransform {
  if (contentWidth <= 0 || contentHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return DEFAULT_VIEWPORT;
  const scale = clampScale(Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight) * 0.92);
  return {
    scale,
    x: Math.max(0, (viewportWidth - contentWidth * scale) / 2),
    y: Math.max(0, (viewportHeight - contentHeight * scale) / 2),
  };
}

export function fitViewportToBounds(bounds: ViewportBounds, viewportWidth: number, viewportHeight: number): ViewportTransform {
  if (bounds.width <= 0 || bounds.height <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return DEFAULT_VIEWPORT;
  const scale = clampScale(Math.min(viewportWidth / bounds.width, viewportHeight / bounds.height) * 0.9);
  return {
    scale,
    x: (viewportWidth - bounds.width * scale) / 2 - bounds.minX * scale,
    y: (viewportHeight - bounds.height * scale) / 2 - bounds.minY * scale,
  };
}

function clampScale(value: number): number {
  return Math.min(4, Math.max(0.25, Number.isFinite(value) ? value : 1));
}
