export function pathExists(data: unknown, path: string): boolean {
  return getPath(data, path) !== undefined;
}

export function getPath(data: unknown, path: string): unknown {
  if (!path) return data;
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, data);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function recordAt(data: unknown, path: string): Record<string, unknown> | null {
  const value = getPath(data, path);
  return isRecord(value) ? value : null;
}

