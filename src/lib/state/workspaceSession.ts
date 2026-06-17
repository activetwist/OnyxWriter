export interface WorkspaceSession {
  rootPath: string;
  openPaths: string[];
  activePath: string;
  updatedAt: string;
}

const WORKSPACE_SESSIONS_KEY = "onyxwriter.workspaceSessions";

export function loadWorkspaceSession(rootPath: string): WorkspaceSession | null {
  const normalizedRoot = rootPath.trim();
  if (!normalizedRoot) return null;
  const sessions = loadWorkspaceSessions();
  const session = sessions[normalizedRoot];
  return isWorkspaceSession(session) ? session : null;
}

export function saveWorkspaceSession(session: WorkspaceSession): void {
  const normalizedRoot = session.rootPath.trim();
  if (!normalizedRoot) return;
  const sessions = loadWorkspaceSessions();
  const uniqueOpenPaths = Array.from(new Set(session.openPaths.filter(Boolean)));
  sessions[normalizedRoot] = {
    rootPath: normalizedRoot,
    openPaths: uniqueOpenPaths,
    activePath: session.activePath && uniqueOpenPaths.includes(session.activePath) ? session.activePath : uniqueOpenPaths[0] ?? "",
    updatedAt: session.updatedAt,
  };
  localStorageProvider()?.setItem(WORKSPACE_SESSIONS_KEY, JSON.stringify(sessions));
}

export function clearWorkspaceSession(rootPath: string): void {
  const normalizedRoot = rootPath.trim();
  if (!normalizedRoot) return;
  const sessions = loadWorkspaceSessions();
  delete sessions[normalizedRoot];
  localStorageProvider()?.setItem(WORKSPACE_SESSIONS_KEY, JSON.stringify(sessions));
}

function loadWorkspaceSessions(): Record<string, WorkspaceSession> {
  const storage = localStorageProvider();
  if (!storage) return {};
  try {
    const parsed = JSON.parse(storage.getItem(WORKSPACE_SESSIONS_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, WorkspaceSession] => isWorkspaceSession(entry[1])),
    );
  } catch {
    return {};
  }
}

function localStorageProvider(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isWorkspaceSession(value: unknown): value is WorkspaceSession {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.rootPath === "string" &&
    Array.isArray(record.openPaths) &&
    record.openPaths.every((path) => typeof path === "string") &&
    typeof record.activePath === "string" &&
    typeof record.updatedAt === "string"
  );
}
