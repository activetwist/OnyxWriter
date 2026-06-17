export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseRgb(value: string): Rgb | null {
  const trimmed = value.trim();
  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const raw = hex[1];
    const normalized =
      raw.length === 3
        ? raw
            .split("")
            .map((part) => part + part)
            .join("")
        : raw.slice(0, 6);
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }

  const rgb = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i);
  if (!rgb) return null;
  const result = { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  return [result.r, result.g, result.b].every((part) => part >= 0 && part <= 255) ? result : null;
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

export function rgbaFromColor(value: string, alpha: number, fallback = ""): string {
  const rgb = parseRgb(value);
  if (!rgb) return fallback;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`;
}

export function darkenHex(value: string, amount: number, fallback = ""): string {
  const rgb = parseRgb(value);
  if (!rgb) return fallback;
  const darken = (part: number) => Math.max(0, Math.round(part * (1 - amount)));
  return `#${toHex(darken(rgb.r))}${toHex(darken(rgb.g))}${toHex(darken(rgb.b))}`;
}

function relativeLuminance(rgb: Rgb): number {
  const values = [rgb.r, rgb.g, rgb.b].map((part) => {
    const channel = part / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

