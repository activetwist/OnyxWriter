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

describe("DrawerGraphView node activation", () => {
  it("opens document nodes by click and keyboard", async () => {
    const onOpenDocument = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(DrawerGraphView, { graph: testGraph, selectedPath: "", onOpenDocument }));
    });

    const node = host.querySelector('[role="button"]');
    expect(node?.textContent).toContain("Orders");

    await act(async () => {
      node?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onOpenDocument).toHaveBeenCalledWith("tables/orders.md");

    await act(async () => {
      node?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    expect(onOpenDocument).toHaveBeenCalledTimes(2);

    await act(async () => root.unmount());
  });
});

const testGraph: DrawerGraph = {
  nodes: [
    { id: "root:/", label: "Drawer", path: "", kind: "root", depth: 0, inbound: 0, outbound: 0 },
    { id: "folder:tables", label: "tables", path: "tables", kind: "folder", depth: 1, inbound: 0, outbound: 0 },
    { id: "document:tables/orders.md", label: "Orders", path: "tables/orders.md", kind: "document", depth: 2, inbound: 0, outbound: 0 },
  ],
  edges: [
    { id: "contains:root:/->folder:tables", source: "root:/", target: "folder:tables", kind: "contains", label: "contains" },
    {
      id: "contains:folder:tables->document:tables/orders.md",
      source: "folder:tables",
      target: "document:tables/orders.md",
      kind: "contains",
      label: "contains",
    },
  ],
};
