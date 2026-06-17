import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VisualEditorSurface } from "../VisualEditorSurface";

vi.mock("../MermaidDiagram", () => ({
  MermaidDiagram: ({ source }: { source: string }) => React.createElement("div", { "data-testid": "mermaid" }, source),
}));

beforeEach(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("VisualEditorSurface links", () => {
  it("opens links from editable visual documents", async () => {
    const onOpenLink = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        React.createElement(VisualEditorSurface, {
          document: {
            path: "tables/orders.md",
            raw: documentRaw("Orders", "See [Customers](customers.md)."),
            dirty: false,
            validation: { errors: [], warnings: [], notices: [] },
          },
          onChange: () => {},
          onOpenLink,
        }),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 5));
    });

    const link = host.querySelector('a[href="customers.md"]');
    expect(link).not.toBeNull();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(onOpenLink).toHaveBeenCalledWith("customers.md");

    await act(async () => root.unmount());
  });

  it("opens links from raw-mode visual previews", async () => {
    const onOpenLink = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        React.createElement(VisualEditorSurface, {
          document: {
            path: "visualizations.md",
            raw: documentRaw("Visualizations", "See [Orders](tables/orders.md).\n\n```mermaid\nflowchart LR\n  A --> B\n```"),
            dirty: false,
            validation: { errors: [], warnings: [], notices: [] },
          },
          onChange: () => {},
          onOpenLink,
        }),
      );
    });

    const link = host.querySelector('a[href="tables/orders.md"]');
    expect(link).not.toBeNull();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(onOpenLink).toHaveBeenCalledWith("tables/orders.md");

    await act(async () => root.unmount());
  });
});

function documentRaw(title: string, body: string): string {
  return ["---", "type: Concept", `title: ${title}`, "description: Link test.", "tags: []", "timestamp: 2026-06-15T00:00:00Z", "---", "", body, ""].join("\n");
}
