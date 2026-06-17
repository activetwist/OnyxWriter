import { isEditableMarkdown, isReservedMarkdown, normalizeWorkspacePath } from "./tree";
import type { WorkspaceEntry } from "./types";

export type DrawerMutationKind = "rename" | "move" | "delete";

export interface PathMove {
  from: string;
  to: string;
}

export interface DrawerMutationPlan {
  kind: DrawerMutationKind;
  sourcePath: string;
  targetPath?: string;
  affectedPaths: string[];
  movedMarkdown: PathMove[];
  linkRepairCount: number;
  indexRefresh: boolean;
  destructive: boolean;
  warnings: string[];
}

export interface DrawerMutationResult {
  ok: boolean;
  message: string;
  selectedPath: string;
  targetPath?: string;
}

export function findWorkspaceEntry(tree: WorkspaceEntry | null, path: string): WorkspaceEntry | null {
  if (!tree) return null;
  if (tree.path === path) return tree;
  for (const child of tree.children) {
    const found = findWorkspaceEntry(child, path);
    if (found) return found;
  }
  return null;
}

export function planRename(tree: WorkspaceEntry | null, sourcePath: string, newName: string): DrawerMutationPlan {
  const entry = requireEntry(tree, sourcePath);
  const safeName = newName.trim();
  if (!safeName || safeName.includes("/") || safeName.includes("\\")) throw new Error("New name must be a single path segment.");
  guardMutable(entry);
  const targetPath = normalizeWorkspacePath([...sourcePath.split("/").slice(0, -1), safeName].filter(Boolean).join("/"));
  if (targetPath === sourcePath) throw new Error("New name does not change the path.");
  if (findWorkspaceEntry(tree, targetPath)) throw new Error(`A bundle item already exists at ${targetPath}.`);
  return buildMovePlan("rename", entry, sourcePath, targetPath);
}

export function planMove(tree: WorkspaceEntry | null, sourcePath: string, destinationFolderPath: string): DrawerMutationPlan {
  const entry = requireEntry(tree, sourcePath);
  guardMutable(entry);
  const destination = destinationFolderPath ? requireEntry(tree, destinationFolderPath) : tree;
  if (!destination || destination.kind !== "folder") throw new Error("Move target must be a folder.");
  if (sourcePath === destination.path || isDescendantPath(destination.path, sourcePath)) {
    throw new Error("Cannot move an item into itself or one of its descendants.");
  }
  const targetPath = normalizeWorkspacePath([destination.path, entry.name].filter(Boolean).join("/"));
  if (targetPath === sourcePath) throw new Error("Item is already in that folder.");
  if (findWorkspaceEntry(tree, targetPath)) throw new Error(`A bundle item already exists at ${targetPath}.`);
  return buildMovePlan("move", entry, sourcePath, targetPath);
}

export function planDelete(tree: WorkspaceEntry | null, sourcePath: string): DrawerMutationPlan {
  const entry = requireEntry(tree, sourcePath);
  guardMutable(entry);
  const affectedPaths = collectPaths(entry);
  return {
    kind: "delete",
    sourcePath,
    affectedPaths,
    movedMarkdown: [],
    linkRepairCount: 0,
    indexRefresh: true,
    destructive: true,
    warnings: [
      entry.kind === "folder"
        ? `Deletes ${affectedPaths.filter((path) => path.endsWith(".md")).length} Markdown file(s) inside this folder.`
        : "Deletes this Markdown file from the bundle.",
    ],
  };
}

export function remapSelectedPath(selectedPath: string, movedPaths: PathMove[], deletedPaths: string[]): string {
  for (const move of movedPaths) {
    if (selectedPath === move.from) return move.to;
    if (isDescendantPath(selectedPath, move.from)) return selectedPath.replace(move.from, move.to);
  }
  return deletedPaths.some((path) => selectedPath === path || isDescendantPath(selectedPath, path)) ? "" : selectedPath;
}

export function mutationStatus(plan: DrawerMutationPlan): string {
  if (plan.kind === "delete") return `Deleted ${plan.sourcePath}.`;
  if (plan.kind === "rename") return `Renamed ${plan.sourcePath} to ${plan.targetPath}.`;
  return `Moved ${plan.sourcePath} to ${plan.targetPath}.`;
}

function buildMovePlan(kind: "rename" | "move", entry: WorkspaceEntry, sourcePath: string, targetPath: string): DrawerMutationPlan {
  const affectedPaths = collectPaths(entry);
  const movedMarkdown = affectedPaths
    .filter((path) => path.endsWith(".md") && !isReservedMarkdown(path))
    .map((from) => ({ from, to: from === sourcePath ? targetPath : from.replace(`${sourcePath}/`, `${targetPath}/`) }));
  return {
    kind,
    sourcePath,
    targetPath,
    affectedPaths,
    movedMarkdown,
    linkRepairCount: movedMarkdown.length,
    indexRefresh: true,
    destructive: false,
    warnings: movedMarkdown.length > 0 ? [`Repairs links to ${movedMarkdown.length} moved Markdown document(s).`] : [],
  };
}

function requireEntry(tree: WorkspaceEntry | null, path: string): WorkspaceEntry {
  if (!path) throw new Error("Bundle root cannot be mutated.");
  const entry = findWorkspaceEntry(tree, path);
  if (!entry) throw new Error(`Bundle item not found: ${path}`);
  return entry;
}

function guardMutable(entry: WorkspaceEntry): void {
  if (entry.kind === "file" && (entry.reserved || isReservedMarkdown(entry.path))) {
    throw new Error("Reserved system files cannot be moved, renamed, or deleted from the normal tree.");
  }
}

function collectPaths(entry: WorkspaceEntry): string[] {
  return [entry.path, ...entry.children.flatMap(collectPaths)];
}

function isDescendantPath(path: string, parent: string): boolean {
  return Boolean(parent) && path.startsWith(`${parent}/`);
}
