import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrawerGraphView } from "../DrawerGraphView";
import type { DrawerGraph } from "../../lib/workspace/graph";

beforeEach(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
  Object.defineProperty(window, "matchMedia", {
    value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    configurable: true,
  });
  Element.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DrawerGraphView hover highlighting", () => {
  it("highlights a focused node neighborhood and dims unrelated nodes", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(DrawerGraphView, { graph: testGraph, selectedPath: "", onOpenDocument: vi.fn() }));
    });

    const orders = host.querySelector('[aria-label^="Orders"]');
    expect(orders).not.toBeNull();

    await act(async () => {
      orders?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });

    expect(orders?.classList.contains("is-neighbor")).toBe(true);
    expect(host.querySelector('[aria-label^="Customers"]')?.classList.contains("is-neighbor")).toBe(true);
    expect(host.querySelector('[aria-label^="Revenue"]')?.classList.contains("is-dimmed")).toBe(true);

    await act(async () => root.unmount());
  });
});

const testGraph: DrawerGraph = {
  nodes: [
    { id: "root:/", label: "Drawer", path: "", kind: "root", depth: 0, inbound: 0, outbound: 0 },
    { id: "document:orders.md", label: "Orders", path: "orders.md", kind: "document", depth: 1, inbound: 0, outbound: 1 },
    { id: "document:customers.md", label: "Customers", path: "customers.md", kind: "document", depth: 1, inbound: 1, outbound: 0 },
    { id: "document:revenue.md", label: "Revenue", path: "revenue.md", kind: "document", depth: 1, inbound: 0, outbound: 0 },
  ],
  edges: [
    { id: "contains:root:/->document:orders.md", source: "root:/", target: "document:orders.md", kind: "contains", label: "contains" },
    { id: "contains:root:/->document:revenue.md", source: "root:/", target: "document:revenue.md", kind: "contains", label: "contains" },
    { id: "link:orders.md->customers.md", source: "document:orders.md", target: "document:customers.md", kind: "link", label: "Customers" },
  ],
};
