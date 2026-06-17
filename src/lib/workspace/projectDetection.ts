export interface WorkspaceFolderInspection {
  path: string;
  name: string;
  entries: string[];
  projectMarkers: string[];
  okfMarkers: string[];
  hasMarkdown: boolean;
}

export interface ProjectRootAssessment {
  likelyProjectRoot: boolean;
  likelyOkfBundle: boolean;
  markers: string[];
  suggestedBundlePath: string;
}

export const PROJECT_ROOT_MARKERS = [
  ".git",
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "Cargo.toml",
  "pyproject.toml",
  "composer.json",
  "go.mod",
  "Gemfile",
  "Makefile",
] as const;

export const OKF_ROOT_MARKERS = ["index.md", "log.md"] as const;

export const IGNORED_WORKSPACE_NAMES = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "build",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  ".vscode",
  "coverage",
  "vendor",
]);

export const DEFAULT_PROJECT_BUNDLE_PATH = "docs/okf";

export function assessWorkspaceFolder(inspection: WorkspaceFolderInspection | null): ProjectRootAssessment {
  const markers = inspection?.projectMarkers ?? [];
  const okfMarkers = inspection?.okfMarkers ?? [];
  return {
    likelyProjectRoot: markers.length > 0,
    likelyOkfBundle: okfMarkers.includes("index.md") && Boolean(inspection?.hasMarkdown),
    markers,
    suggestedBundlePath: DEFAULT_PROJECT_BUNDLE_PATH,
  };
}

export function isIgnoredWorkspaceName(name: string): boolean {
  return IGNORED_WORKSPACE_NAMES.has(name);
}

export function isIgnoredWorkspacePath(path: string): boolean {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .some((part) => isIgnoredWorkspaceName(part));
}

export function validateProjectBundleSubpath(path: string): string {
  const normalized = path.replace(/\\/g, "/").trim();
  if (!normalized) throw new Error("Bundle folder path is required.");
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    throw new Error("Bundle folder path must be relative to the selected project.");
  }
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length) throw new Error("Bundle folder path is required.");
  for (const part of parts) {
    if (part === "." || part === "..") throw new Error("Bundle folder path cannot contain traversal segments.");
    if (part === ".git") throw new Error("Bundle folder path cannot target source-control metadata.");
  }
  return parts.join("/");
}

export function joinHostPath(rootPath: string, relativePath: string): string {
  const normalizedRoot = rootPath.replace(/[\\/]+$/, "");
  const normalizedRelative = validateProjectBundleSubpath(relativePath);
  return `${normalizedRoot}/${normalizedRelative}`;
}
