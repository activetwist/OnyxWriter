import { describe, expect, it } from "vitest";
import { buildDrawerGraph } from "../graph";
import type { WorkspaceEntry } from "../types";

const tree: WorkspaceEntry = {
  name: "Drawer",
  path: "",
  kind: "folder",
  reserved: false,
  children: [
    {
      name: "tables",
      path: "tables",
      kind: "folder",
      reserved: false,
      children: [
        { name: "orders.md", path: "tables/orders.md", kind: "file", reserved: false, children: [] },
        { name: "customers.md", path: "tables/customers.md", kind: "file", reserved: false, children: [] },
      ],
    },
    {
      name: ".git",
      path: ".git",
      kind: "folder",
      reserved: false,
      children: [{ name: "config.md", path: ".git/config.md", kind: "file", reserved: false, children: [] }],
    },
    { name: "index.md", path: "index.md", kind: "file", reserved: true, children: [] },
  ],
};

describe("drawer graph", () => {
  it("builds folder, document, link, and broken-link nodes", () => {
    const graph = buildDrawerGraph(
      tree,
      {
        "tables/orders.md": "[Customers](customers.md)\n[Missing](missing.md)",
        "tables/customers.md": "[Orders](orders.md)",
      },
      { includeSystemFiles: false },
    );
    expect(graph.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        "root:/",
        "folder:tables",
        "document:tables/orders.md",
        "document:tables/customers.md",
        "broken:tables/missing.md",
      ]),
    );
    expect(graph.nodes.map((node) => node.id)).not.toContain("system:index.md");
    expect(graph.nodes.map((node) => node.id)).not.toContain("document:.git/config.md");
    expect(graph.edges.map((edge) => edge.kind)).toEqual(expect.arrayContaining(["contains", "link", "broken-link"]));
    expect(graph.nodes.find((node) => node.id === "document:tables/orders.md")).toMatchObject({ outbound: 2, inbound: 1 });
  });

  it("can include reserved system Markdown files", () => {
    const graph = buildDrawerGraph(tree, { "index.md": "" }, { includeSystemFiles: true });
    expect(graph.nodes.map((node) => node.id)).toContain("system:index.md");
  });
});
