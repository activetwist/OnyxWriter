import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { layoutDrawerGraph } from "../../src/lib/visualization/drawerGraphLayout";
import { graphBounds } from "../../src/lib/visualization/drawerGraphPhysics";
import { buildDrawerGraph } from "../../src/lib/workspace/graph";
import type { WorkspaceEntry } from "../../src/lib/workspace/types";

const fixtureRoot: WorkspaceEntry = {
  name: "okf-basic",
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
    { name: "visualizations.md", path: "visualizations.md", kind: "file", reserved: false, children: [] },
    { name: "index.md", path: "index.md", kind: "file", reserved: true, children: [] },
  ],
};

describe("drawer graph smoke", () => {
  it("builds and lays out a graph from OKF fixture documents", () => {
    const documents = {
      "visualizations.md": readFileSync(join(process.cwd(), "tests/fixtures/okf-basic/visualizations.md"), "utf8"),
      "tables/orders.md": readFileSync(join(process.cwd(), "tests/fixtures/okf-basic/tables/orders.md"), "utf8"),
      "tables/customers.md": readFileSync(join(process.cwd(), "tests/fixtures/okf-basic/tables/customers.md"), "utf8"),
    };
    const graph = buildDrawerGraph(fixtureRoot, documents);
    const layout = layoutDrawerGraph(graph, 800, 520);

    expect(graph.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(["document:visualizations.md", "document:tables/orders.md", "broken:missing.md"]),
    );
    expect(graph.edges.map((edge) => edge.kind)).toEqual(expect.arrayContaining(["contains", "link", "broken-link"]));
    expect(layout.edges.length).toBeGreaterThan(0);
    expect(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
    expect(layout.nodes.every((node) => node.radius <= 16 && node.shortLabel.length <= 24)).toBe(true);
    expect(graphBounds(layout.nodes).width).toBeGreaterThan(1);
  });
});
