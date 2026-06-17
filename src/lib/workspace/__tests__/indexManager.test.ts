import { describe, expect, it } from "vitest";
import { defaultIndexContent, generateDirectoryIndexBlock, generateIndexBlock, indexPathForDirectory, indexableDirectoryPaths, updateManagedIndexContent } from "../indexManager";
import type { WorkspaceEntry } from "../types";

const tree: WorkspaceEntry = {
  name: "root",
  path: "",
  kind: "folder",
  reserved: false,
  children: [
    { name: "index.md", path: "index.md", kind: "file", reserved: true, children: [] },
    {
      name: "tables",
      path: "tables",
      kind: "folder",
      reserved: false,
      children: [
        { name: "index.md", path: "tables/index.md", kind: "file", reserved: true, children: [] },
        { name: "orders.md", path: "tables/orders.md", kind: "file", reserved: false, children: [] },
      ],
    },
    {
      name: "dist",
      path: "dist",
      kind: "folder",
      reserved: false,
      children: [{ name: "generated.md", path: "dist/generated.md", kind: "file", reserved: false, children: [] }],
    },
  ],
};

describe("index manager", () => {
  it("generates links for editable concept documents only", () => {
    const block = generateIndexBlock(tree);
    expect(block).toContain("[Orders](tables/orders.md)");
    expect(block).not.toContain("index.md");
  });

  it("replaces only the managed block", () => {
    const existing = "# Index\n\nKeep this prose.\n\n<!-- onyxwriter:index:start -->\nold\n<!-- onyxwriter:index:end -->\n\nKeep this too.\n";
    const next = updateManagedIndexContent(existing, generateIndexBlock(tree));
    expect(next).toContain("Keep this prose.");
    expect(next).toContain("Keep this too.");
    expect(next).toContain("[Orders](tables/orders.md)");
    expect(next).not.toContain("\nold\n");
  });

  it("generates directory-local index links", () => {
    expect(indexableDirectoryPaths(tree)).toEqual(["", "tables"]);
    expect(indexPathForDirectory("tables")).toBe("tables/index.md");
    const rootBlock = generateDirectoryIndexBlock(tree, "");
    const nestedBlock = generateDirectoryIndexBlock(tree, "tables");
    expect(rootBlock).toContain("[tables](tables/index.md)");
    expect(rootBlock).not.toContain("dist");
    expect(nestedBlock).toContain("[Orders](orders.md)");
  });

  it("keeps frontmatter root-only in default index content", () => {
    expect(defaultIndexContent(tree, "")).toContain('okf_version: "0.1"');
    expect(defaultIndexContent(tree, "tables")).not.toContain("okf_version");
  });
});
