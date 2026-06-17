import { describe, expect, it } from "vitest";
import { layoutDrawerGraph } from "../drawerGraphLayout";
import type { DrawerGraph } from "../../workspace/graph";

describe("drawer graph layout", () => {
  it("positions nodes and resolves renderable edges", () => {
    const graph: DrawerGraph = {
      nodes: [
        { id: "root:/", label: "Drawer", path: "", kind: "root", depth: 0, inbound: 0, outbound: 0 },
        { id: "document:a.md", label: "A", path: "a.md", kind: "document", depth: 1, inbound: 1, outbound: 1 },
      ],
      edges: [{ id: "link:a.md->a.md", source: "document:a.md", target: "document:a.md", kind: "link", label: "self" }],
    };
    const layout = layoutDrawerGraph(graph, 640, 420);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.edges).toHaveLength(1);
    expect(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
    expect(layout.edges[0].sourceNode.id).toBe("document:a.md");
  });
});
