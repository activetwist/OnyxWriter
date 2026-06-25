import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../AppShell";

vi.mock("../MermaidDiagram", () => ({
  MermaidDiagram: ({ source }: { source: string }) => React.createElement("div", { "data-testid": "mermaid" }, source),
}));

beforeEach(() => {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
  };
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, configurable: true });
  Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("AppShell document tabs", () => {
  it("cycles open documents with Ctrl+Tab and Ctrl+Shift+Tab", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(AppShell));
    });

    await act(async () => {
      buttonByLabel(host, "Open Bundle").click();
    });

    await waitFor(() => host.querySelector('a[href="customers.md"]'));

    await act(async () => {
      host.querySelector('a[href="customers.md"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    await waitFor(() => activeTabLabel(host) === "Customers");
    expect(tabLabels(host)).toContain("Orders");
    expect(tabLabels(host)).toContain("Customers");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
    });

    await waitFor(() => activeTabLabel(host) === "Orders");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true, bubbles: true, cancelable: true }));
    });

    await waitFor(() => activeTabLabel(host) === "Customers");

    await act(async () => {
      root.unmount();
    });
  });

  it("closes the active tab with Command+W", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(AppShell));
    });

    await act(async () => {
      buttonByLabel(host, "Open Bundle").click();
    });

    await waitFor(() => host.querySelector('a[href="customers.md"]'));

    await act(async () => {
      host.querySelector('a[href="customers.md"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    await waitFor(() => activeTabLabel(host) === "Customers");

    const keyEvent = new KeyboardEvent("keydown", { key: "w", metaKey: true, bubbles: true, cancelable: true });
    await act(async () => {
      window.dispatchEvent(keyEvent);
    });

    expect(keyEvent.defaultPrevented).toBe(true);
    await waitFor(() => activeTabLabel(host) === "Orders");
    expect(tabLabels(host)).toEqual(["Orders"]);

    await act(async () => {
      root.unmount();
    });
  });

  it("does not consume Command+W when no document tab is open", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(AppShell));
    });

    const keyEvent = new KeyboardEvent("keydown", { key: "w", metaKey: true, bubbles: true, cancelable: true });
    await act(async () => {
      window.dispatchEvent(keyEvent);
    });

    expect(keyEvent.defaultPrevented).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });
});

function buttonByLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.getAttribute("aria-label") === label || item.getAttribute("title") === label);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return button;
}

function activeTabLabel(host: HTMLElement): string {
  return host.querySelector(".document-tab.active .document-tab-label")?.textContent ?? "";
}

function tabLabels(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll(".document-tab-label")).map((item) => item.textContent ?? "");
}

async function waitFor(assertion: () => unknown): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    let result: unknown;
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 10));
      result = assertion();
    });
    if (result) return;
  }
  throw new Error("Timed out waiting for condition");
}
