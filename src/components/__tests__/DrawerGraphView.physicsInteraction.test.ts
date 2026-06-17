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

describe("DrawerGraphView physics interactions", () => {
  it("separates node drag from document activation", async () => {
    const onOpenDocument = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(DrawerGraphView, { graph: testGraph, selectedPath: "", onOpenDocument }));
    });

    const svg = host.querySelector("svg");
    const node = host.querySelector('[aria-label^="Orders"]');
    Object.defineProperty(svg, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 960, height: 640, right: 960, bottom: 640, x: 0, y: 0, toJSON: () => ({}) }),
      configurable: true,
    });

    await act(async () => {
      node?.dispatchEvent(pointerEvent("pointerdown", 100, 100));
      svg?.dispatchEvent(pointerEvent("pointermove", 180, 140));
      node?.dispatchEvent(pointerEvent("pointerup", 180, 140));
      node?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onOpenDocument).not.toHaveBeenCalled();

    await act(async () => {
      node?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onOpenDocument).toHaveBeenCalledWith("orders.md");

    await act(async () => root.unmount());
  });
});

function pointerEvent(type: string, clientX: number, clientY: number): Event {
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY }) as Event;
}

const testGraph: DrawerGraph = {
  nodes: [
    { id: "root:/", label: "Drawer", path: "", kind: "root", depth: 0, inbound: 0, outbound: 0 },
    { id: "document:orders.md", label: "Orders", path: "orders.md", kind: "document", depth: 1, inbound: 0, outbound: 0 },
  ],
  edges: [{ id: "contains:root:/->document:orders.md", source: "root:/", target: "document:orders.md", kind: "contains", label: "contains" }],
};
