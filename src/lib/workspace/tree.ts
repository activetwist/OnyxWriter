import type { TreeNode, WorkspaceEntry } from "./types";
import { isIgnoredWorkspacePath } from "./projectDetection";

export interface FlattenTreeOptions {
  includeSystemFiles?: boolean;
  collapsedPaths?: Set<string> | string[];
  sortDirection?: "asc" | "desc";
}

export function flattenTree(entry: WorkspaceEntry | null, depth = 0, options: FlattenTreeOptions = {}): TreeNode[] {
  if (!entry) return [];
  if (entry.path && isIgnoredWorkspacePath(entry.path)) return [];
  if (entry.kind === "file" && isMarkdownEntry(entry) && isReservedMarkdown(entry.path) && !options.includeSystemFiles) return [];
  const nodes: TreeNode[] = [{ ...entry, depth }];
  if (entry.kind === "folder" && entry.path && collapsedPathSet(options).has(entry.path)) return nodes;
  const direction = options.sortDirection === "desc" ? -1 : 1;
  const folders = entry.children.filter((child) => child.kind === "folder").sort((a, b) => sortEntries(a, b) * direction);
  const files = entry.children.filter((child) => child.kind === "file").sort((a, b) => sortEntries(a, b) * direction);
  for (const child of [...folders, ...files]) {
    nodes.push(...flattenTree(child, depth + 1, options));
  }
  return nodes;
}

export function flattenEditableTree(entry: WorkspaceEntry | null): TreeNode[] {
  return flattenTree(entry, 0, { includeSystemFiles: false });
}

export function markdownPaths(entry: WorkspaceEntry | null): string[] {
  return flattenTree(entry, 0, { includeSystemFiles: true })
    .filter((node) => node.kind === "file" && isMarkdownEntry(node))
    .map((node) => node.path)
    .filter(Boolean);
}

export function linkableMarkdownPaths(entry: WorkspaceEntry | null, options: FlattenTreeOptions = {}): string[] {
  return flattenTree(entry, 0, { includeSystemFiles: Boolean(options.includeSystemFiles) })
    .filter((node) => node.kind === "file" && isMarkdownEntry(node))
    .map((node) => node.path)
    .filter((path) => path.endsWith(".md"))
    .filter((path) => options.includeSystemFiles || !isReservedMarkdown(path));
}

export function isReservedMarkdown(path: string): boolean {
  const name = path.split("/").pop();
  return name === "index.md" || name === "log.md";
}

export function isEditableMarkdown(path: string): boolean {
  return path.endsWith(".md") && !isReservedMarkdown(path);
}

export function isMarkdownEntry(entry: Pick<WorkspaceEntry, "path" | "fileType">): boolean {
  return entry.fileType === "markdown" || (!entry.fileType && entry.path.endsWith(".md"));
}

export function isImageEntry(entry: Pick<WorkspaceEntry, "path" | "fileType">): boolean {
  return entry.fileType === "image" || isImagePath(entry.path);
}

export function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(path);
}

export function normalizeWorkspacePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") throw new Error("path traversal is not allowed");
    parts.push(part);
  }
  return parts.join("/");
}

export function ancestorFolderPaths(path: string): string[] {
  const parts = normalizeWorkspacePath(path).split("/").filter(Boolean);
  const ancestors: string[] = [];
  for (let index = 1; index < parts.length; index += 1) {
    ancestors.push(parts.slice(0, index).join("/"));
  }
  return ancestors;
}

function collapsedPathSet(options: FlattenTreeOptions): Set<string> {
  if (!options.collapsedPaths) return new Set();
  return options.collapsedPaths instanceof Set ? options.collapsedPaths : new Set(options.collapsedPaths);
}

function sortEntries(a: WorkspaceEntry, b: WorkspaceEntry): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}
