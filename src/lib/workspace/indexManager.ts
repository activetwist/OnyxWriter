import { markdownTitleFallback } from "../okf";
import { isIgnoredWorkspacePath } from "./projectDetection";
import { flattenTree, isEditableMarkdown, normalizeWorkspacePath } from "./tree";
import type { WorkspaceEntry } from "./types";

export const INDEX_MANAGED_START = "<!-- onyxwriter:index:start -->";
export const INDEX_MANAGED_END = "<!-- onyxwriter:index:end -->";

export function generateIndexBlock(tree: WorkspaceEntry | null, heading = "Documents"): string {
  const paths = flattenTree(tree, 0, { includeSystemFiles: false })
    .filter((node) => node.kind === "file" && isEditableMarkdown(node.path))
    .map((node) => node.path);

  const lines = paths.length
    ? paths.map((path) => `- [${markdownTitleFallback(path)}](${path})`)
    : ["- No concept documents yet."];

  return [INDEX_MANAGED_START, `## ${heading}`, "", ...lines, INDEX_MANAGED_END].join("\n");
}

export function generateDirectoryIndexBlock(tree: WorkspaceEntry | null, directoryPath = "", heading = "Documents"): string {
  const directory = findDirectory(tree, directoryPath);
  const children = (directory?.children ?? []).filter((child) => !isIgnoredWorkspacePath(child.path));
  const folders = children
    .filter((child) => child.kind === "folder")
    .sort(sortEntries)
    .map((folder) => `- [${folder.name}](${relativeIndexHref(directoryPath, `${folder.path}/index.md`)})`);
  const files = children
    .filter((child) => child.kind === "file" && isEditableMarkdown(child.path))
    .sort(sortEntries)
    .map((file) => `- [${markdownTitleFallback(file.path)}](${relativeIndexHref(directoryPath, file.path)})`);
  const lines = [...folders, ...files];

  return [INDEX_MANAGED_START, `## ${heading}`, "", ...(lines.length ? lines : ["- No concept documents yet."]), INDEX_MANAGED_END].join("\n");
}

export function indexPathForDirectory(directoryPath = ""): string {
  const normalized = directoryPath ? normalizeWorkspacePath(directoryPath) : "";
  return normalized ? `${normalized}/index.md` : "index.md";
}

export function defaultIndexContent(tree: WorkspaceEntry | null, directoryPath = ""): string {
  const normalized = directoryPath ? normalizeWorkspacePath(directoryPath) : "";
  const title = normalized ? markdownTitleFallback(normalized) : "Index";
  const frontmatter = normalized ? "" : `---\nokf_version: "0.1"\n---\n\n`;
  return `${frontmatter}# ${title}\n\n${generateDirectoryIndexBlock(tree, normalized)}\n`;
}

export function indexableDirectoryPaths(tree: WorkspaceEntry | null): string[] {
  return flattenTree(tree, 0, { includeSystemFiles: true })
    .filter((node) => node.kind === "folder")
    .map((node) => node.path)
    .filter((path, index, paths) => paths.indexOf(path) === index);
}

export function updateManagedIndexContent(existing: string, managedBlock: string): string {
  const normalized = existing.replace(/\r\n/g, "\n").trimEnd();
  const start = normalized.indexOf(INDEX_MANAGED_START);
  const end = normalized.indexOf(INDEX_MANAGED_END);

  if (start !== -1 && end !== -1 && end > start) {
    const before = normalized.slice(0, start).trimEnd();
    const after = normalized.slice(end + INDEX_MANAGED_END.length).trimStart();
    return [before, managedBlock, after].filter(Boolean).join("\n\n") + "\n";
  }

  return [normalized || "# Index", managedBlock].filter(Boolean).join("\n\n") + "\n";
}

export function defaultRootIndexContent(tree: WorkspaceEntry | null): string {
  return `---\nokf_version: "0.1"\n---\n\n# Index\n\n${generateIndexBlock(tree)}\n`;
}

function findDirectory(tree: WorkspaceEntry | null, directoryPath: string): WorkspaceEntry | null {
  if (!tree) return null;
  const normalized = directoryPath ? normalizeWorkspacePath(directoryPath) : "";
  if (tree.kind === "folder" && tree.path === normalized) return tree;
  for (const child of tree.children) {
    const found = findDirectory(child, normalized);
    if (found) return found;
  }
  return null;
}

function relativeIndexHref(fromDirectoryPath: string, targetPath: string): string {
  const normalizedFrom = fromDirectoryPath ? normalizeWorkspacePath(fromDirectoryPath) : "";
  const normalizedTarget = normalizeWorkspacePath(targetPath);
  if (!normalizedFrom) return normalizedTarget;
  const prefix = `${normalizedFrom}/`;
  return normalizedTarget.startsWith(prefix) ? normalizedTarget.slice(prefix.length) : normalizedTarget;
}

function sortEntries(a: WorkspaceEntry, b: WorkspaceEntry): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}
