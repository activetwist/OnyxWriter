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
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
});

describe("AppShell document opening", () => {
  it("keeps the app rendered when selecting a document", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(AppShell));
    });

    await act(async () => {
      buttonByLabel(host, "Open Bundle").click();
    });

    expect(buttonByName(host, "orders.md")).not.toBeNull();
    await waitFor(() => host.querySelector('a[href="customers.md"]'));

    await act(async () => {
      host.querySelector('a[href="customers.md"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    await waitFor(() => host.textContent?.includes("Opened tables/customers.md."));
    expect(host.textContent).toContain("Opened tables/customers.md.");

    await act(async () => {
      buttonByName(host, "customers.md").click();
    });

    expect(host.querySelector(".app-shell")).not.toBeNull();
    expect(host.querySelector(".editor-pane")).not.toBeNull();
    expect(host.textContent).toContain("Customers");
    expect(host.textContent).toContain("Orders");
    expect(host.textContent).not.toContain("Thematic breaks should be edited in raw mode.");

    await act(async () => {
      root.unmount();
    });
  });
});

function buttonByName(host: HTMLElement, text: string): HTMLElement {
  const button = Array.from(host.querySelectorAll('button, [role="button"]')).find((item) => item.textContent?.includes(text));
  if (!(button instanceof HTMLElement)) throw new Error(`Button not found: ${text}`);
  return button;
}

function buttonByLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.getAttribute("aria-label") === label || item.getAttribute("title") === label);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return button;
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
