import { markdownTitleFallback } from "../okf";
import { flattenTree, isEditableMarkdown, isReservedMarkdown, markdownPaths } from "./tree";
import type { WorkspaceEntry } from "./types";
import { indexDocumentLinks } from "./linkIndex";

export type DrawerGraphNodeKind = "root" | "folder" | "document" | "system" | "broken";
export type DrawerGraphEdgeKind = "contains" | "link" | "broken-link";

export interface DrawerGraphNode {
  id: string;
  label: string;
  path: string;
  kind: DrawerGraphNodeKind;
  depth: number;
  inbound: number;
  outbound: number;
}

export interface DrawerGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: DrawerGraphEdgeKind;
  label: string;
  broken?: boolean;
}

export interface DrawerGraph {
  nodes: DrawerGraphNode[];
  edges: DrawerGraphEdge[];
}

export interface BuildDrawerGraphOptions {
  includeSystemFiles?: boolean;
}

export function buildDrawerGraph(
  tree: WorkspaceEntry | null,
  documents: Record<string, string>,
  options: BuildDrawerGraphOptions = {},
): DrawerGraph {
  if (!tree) return { nodes: [], edges: [] };
  const knownPaths = new Set(markdownPaths(tree));
  const nodes = new Map<string, DrawerGraphNode>();
  const edges: DrawerGraphEdge[] = [];
  const nodeForPath = (path: string, kind: DrawerGraphNodeKind) => `${kind}:${path || "/"}`;
  const rootId = nodeForPath("", "root");
  nodes.set(rootId, { id: rootId, label: tree.name || "Bundle", path: "", kind: "root", depth: 0, inbound: 0, outbound: 0 });

  for (const node of flattenTree(tree, 0, { includeSystemFiles: options.includeSystemFiles })) {
    if (!node.path) continue;
    if (node.kind === "file" && !options.includeSystemFiles && isReservedMarkdown(node.path)) continue;
    const kind = node.kind === "folder" ? "folder" : isEditableMarkdown(node.path) ? "document" : "system";
    const id = nodeForPath(node.path, kind);
    nodes.set(id, {
      id,
      label: node.kind === "file" ? markdownTitleFallback(node.path) : node.name,
      path: node.path,
      kind,
      depth: node.depth,
      inbound: 0,
      outbound: 0,
    });
    const parentPath = node.path.split("/").slice(0, -1).join("/");
    const parentFolder = parentPath ? nodeForPath(parentPath, "folder") : rootId;
    edges.push({
      id: `contains:${parentFolder}->${id}`,
      source: parentFolder,
      target: id,
      kind: "contains",
      label: "contains",
    });
  }

  for (const [fromPath, markdown] of Object.entries(documents)) {
    const source = nodeForPath(fromPath, isReservedMarkdown(fromPath) ? "system" : "document");
    if (!nodes.has(source)) continue;
    for (const link of indexDocumentLinks(fromPath, markdown, knownPaths)) {
      if (link.kind !== "internal") continue;
      const targetPath = link.targetPath ?? "";
      const existingKind = isReservedMarkdown(targetPath) ? "system" : "document";
      let target = nodeForPath(targetPath, existingKind);
      const broken = link.broken || !nodes.has(target);
      if (broken) {
        target = `broken:${targetPath || link.href}`;
        if (!nodes.has(target)) {
          nodes.set(target, {
            id: target,
            label: targetPath || link.href,
            path: targetPath,
            kind: "broken",
            depth: 0,
            inbound: 0,
            outbound: 0,
          });
        }
      }
      edges.push({
        id: `${broken ? "broken-link" : "link"}:${fromPath}->${targetPath || link.href}`,
        source,
        target,
        kind: broken ? "broken-link" : "link",
        label: link.label || link.href,
        broken,
      });
    }
  }

  for (const edge of edges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (source) source.outbound += edge.kind === "contains" ? 0 : 1;
    if (target) target.inbound += edge.kind === "contains" ? 0 : 1;
  }

  return { nodes: [...nodes.values()], edges };
}
