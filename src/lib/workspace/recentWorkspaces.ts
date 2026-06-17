export interface RecentWorkspace {
  path: string;
  name: string;
  openedAt: string;
}

const RECENT_WORKSPACES_KEY = "onyxwriter.recentWorkspaces";
const RECENT_DRAWERS_KEY = "onyxwriter.recentDrawers";
const MAX_RECENT_WORKSPACES = 8;

export function loadRecentWorkspaces(): RecentWorkspace[] {
  return loadRecentDrawers();
}

export function loadRecentDrawers(): RecentWorkspace[] {
  const storage = localStorageProvider();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(RECENT_DRAWERS_KEY) ?? storage.getItem(RECENT_WORKSPACES_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentWorkspace);
  } catch {
    return [];
  }
}

export function rememberWorkspace(path: string, now = new Date()): RecentWorkspace[] {
  return rememberDrawer(path, now);
}

export function rememberDrawer(path: string, now = new Date()): RecentWorkspace[] {
  const normalized = path.trim();
  if (!normalized) return loadRecentDrawers();
  const record: RecentWorkspace = {
    path: normalized,
    name: workspaceNameFromPath(normalized),
    openedAt: now.toISOString(),
  };
  const next = [record, ...loadRecentDrawers().filter((item) => item.path !== normalized)].slice(0, MAX_RECENT_WORKSPACES);
  localStorageProvider()?.setItem(RECENT_DRAWERS_KEY, JSON.stringify(next));
  return next;
}

export function forgetRecentWorkspace(path: string): RecentWorkspace[] {
  return forgetRecentDrawer(path);
}

export function forgetRecentDrawer(path: string): RecentWorkspace[] {
  const next = loadRecentDrawers().filter((item) => item.path !== path);
  localStorageProvider()?.setItem(RECENT_DRAWERS_KEY, JSON.stringify(next));
  return next;
}

function localStorageProvider(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function workspaceNameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  return normalized.split("/").pop() || normalized;
}

function isRecentWorkspace(value: unknown): value is RecentWorkspace {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.path === "string" && typeof record.name === "string" && typeof record.openedAt === "string";
}
