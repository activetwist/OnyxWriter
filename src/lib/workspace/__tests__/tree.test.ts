import { describe, expect, it } from "vitest";
import { ancestorFolderPaths, flattenTree, isEditableMarkdown, isReservedMarkdown, linkableMarkdownPaths, markdownPaths, normalizeWorkspacePath } from "../tree";
import type { WorkspaceEntry } from "../types";

const tree: WorkspaceEntry = {
  name: "root",
  path: "",
  kind: "folder",
  reserved: false,
  children: [
    { name: "b.md", path: "b.md", kind: "file", reserved: false, children: [] },
    { name: "index.md", path: "index.md", kind: "file", reserved: true, children: [] },
    {
      name: "tables",
      path: "tables",
      kind: "folder",
      reserved: false,
      children: [{ name: "orders.md", path: "tables/orders.md", kind: "file", reserved: false, children: [] }],
    },
    {
      name: "node_modules",
      path: "node_modules",
      kind: "folder",
      reserved: false,
      children: [{ name: "package.md", path: "node_modules/package.md", kind: "file", reserved: false, children: [] }],
    },
  ],
};

describe("workspace tree", () => {
  it("flattens folders before files", () => {
    expect(flattenTree(tree).map((node) => node.path)).toEqual(["", "tables", "tables/orders.md", "b.md"]);
    expect(flattenTree(tree, 0, { includeSystemFiles: true }).map((node) => node.path)).toEqual(["", "tables", "tables/orders.md", "b.md", "index.md"]);
  });

  it("can collapse folder descendants without hiding the folder", () => {
    expect(flattenTree(tree, 0, { collapsedPaths: new Set(["tables"]) }).map((node) => node.path)).toEqual(["", "tables", "b.md"]);
  });

  it("lists ancestor folders for tree expansion", () => {
    expect(ancestorFolderPaths("domains/commerce/orders.md")).toEqual(["domains", "domains/commerce"]);
  });

  it("normalizes safe paths and rejects traversal", () => {
    expect(normalizeWorkspacePath("./tables/orders.md")).toBe("tables/orders.md");
    expect(() => normalizeWorkspacePath("../outside.md")).toThrow();
  });

  it("recognizes reserved markdown files", () => {
    expect(isReservedMarkdown("tables/index.md")).toBe(true);
    expect(isReservedMarkdown("tables/orders.md")).toBe(false);
    expect(isEditableMarkdown("tables/index.md")).toBe(false);
    expect(isEditableMarkdown("tables/orders.md")).toBe(true);
  });

  it("lists linkable Markdown paths without reserved files by default", () => {
    expect(linkableMarkdownPaths(tree)).toEqual(["tables/orders.md", "b.md"]);
    expect(linkableMarkdownPaths(tree, { includeSystemFiles: true })).toEqual(["tables/orders.md", "b.md", "index.md"]);
  });

  it("hides ignored development folders from in-memory trees", () => {
    expect(flattenTree(tree, 0, { includeSystemFiles: true }).map((node) => node.path)).not.toContain("node_modules/package.md");
    expect(markdownPaths(tree)).not.toContain("node_modules/package.md");
  });
});
