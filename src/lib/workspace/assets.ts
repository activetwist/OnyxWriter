export const DRAWER_IMAGE_ASSET_DIR = "assets/images";

const SAFE_ASSET_NAME = /^[a-zA-Z0-9._-]+$/;

export function imageAssetPath(filename: string): string {
  const safeName = sanitizeAssetFilename(filename);
  return `${DRAWER_IMAGE_ASSET_DIR}/${safeName}`;
}

export function sanitizeAssetFilename(filename: string): string {
  const name = filename.split(/[\\/]/).pop()?.trim() || "image.png";
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safe || !SAFE_ASSET_NAME.test(safe)) return "image.png";
  return safe;
}

export function isDrawerImageAssetPath(path: string): boolean {
  return path.startsWith(`${DRAWER_IMAGE_ASSET_DIR}/`) && !path.includes("..");
}
