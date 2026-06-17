import { describe, expect, it } from "vitest";
import {
  createInitialGraphNodes,
  createSimulationLinks,
  graphBounds,
  graphNeighborhood,
  graphNodeRadius,
  settleDrawerGraph,
  truncateGraphLabel,
} from "../drawerGraphPhysics";
import type { DrawerGraph } from "../../workspace/graph";

describe("drawer graph physics", () => {
  it("creates smaller visual nodes with degree-aware labels", () => {
    const [root, document] = createInitialGraphNodes(testGraph, { width: 800, height: 520 });
    expect(root.radius).toBeLessThan(16);
    expect(document.radius).toBeLessThan(12);
    expect(truncateGraphLabel("Customer Lifetime Value")).toBe("Customer Lifetime Value");
    expect(truncateGraphLabel("An excessively long graph document label", 16)).toBe("An excessively…");
  });

  it("creates graph links and settles finite positions", () => {
    const layout = settleDrawerGraph(testGraph, { width: 800, height: 520 }, 30);
    const links = createSimulationLinks(testGraph, layout.nodes);
    expect(links).toHaveLength(2);
    expect(layout.edges).toHaveLength(2);
    expect(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
  });

  it("computes bounds and connected neighborhoods", () => {
    const layout = settleDrawerGraph(testGraph, { width: 800, height: 520 }, 10);
    const bounds = graphBounds(layout.nodes, 12);
    expect(bounds.width).toBeGreaterThan(1);
    expect(bounds.height).toBeGreaterThan(1);

    const neighborhood = graphNeighborhood(testGraph, "document:orders.md");
    expect(neighborhood.nodeIds).toEqual(new Set(["document:orders.md", "root:/", "document:customers.md"]));
    expect(neighborhood.edgeIds).toEqual(new Set(["contains:root:/->document:orders.md", "link:orders.md->customers.md"]));
  });
});

const testGraph: DrawerGraph = {
  nodes: [
    { id: "root:/", label: "Drawer", path: "", kind: "root", depth: 0, inbound: 0, outbound: 0 },
    { id: "document:orders.md", label: "Orders", path: "orders.md", kind: "document", depth: 1, inbound: 0, outbound: 1 },
    { id: "document:customers.md", label: "Customers", path: "customers.md", kind: "document", depth: 1, inbound: 1, outbound: 0 },
  ],
  edges: [
    { id: "contains:root:/->document:orders.md", source: "root:/", target: "document:orders.md", kind: "contains", label: "contains" },
    { id: "link:orders.md->customers.md", source: "document:orders.md", target: "document:customers.md", kind: "link", label: "Customers" },
  ],
};
