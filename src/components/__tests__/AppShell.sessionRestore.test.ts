import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceEntry } from "../../lib/workspace/types";

const tree: WorkspaceEntry = {
  name: "Onyx-Test",
  path: "",
  kind: "folder",
  reserved: false,
  children: [
    { name: "orders.md", path: "orders.md", kind: "file", reserved: false, children: [] },
    { name: "customers.md", path: "customers.md", kind: "file", reserved: false, children: [] },
  ],
};

const files: Record<string, string> = {
  "orders.md": "---\ntype: Concept\ntitle: Orders\n---\n\n# Orders\n",
  "customers.md": "---\ntype: Concept\ntitle: Customers\n---\n\n# Customers\n",
};

vi.mock("../../lib/workspace/api", () => ({
  createWorkspaceFolder: vi.fn(),
  createWorkspaceMarkdownFile: vi.fn(),
  deleteWorkspacePath: vi.fn(),
  directoryHasEntries: vi.fn(() => Promise.resolve(false)),
  initializeWorkspace: vi.fn(),
  inspectWorkspaceFolder: vi.fn(() =>
    Promise.resolve({ path: "/tmp/Onyx-Test", name: "Onyx-Test", entries: ["index.md"], projectMarkers: [], okfMarkers: ["index.md"], hasMarkdown: true }),
  ),
  isTauriRuntime: vi.fn(() => true),
  listWorkspace: vi.fn(() => Promise.resolve(tree)),
  moveWorkspacePath: vi.fn(),
  readWorkspaceFile: vi.fn((_: string, relativePath: string) => {
    const contents = files[relativePath];
    if (contents === undefined) return Promise.reject(new Error(`Missing ${relativePath}`));
    return Promise.resolve(contents);
  }),
  renameWorkspacePath: vi.fn(),
  revealWorkspacePath: vi.fn(() => Promise.resolve()),
  selectAndImportDrawerImage: vi.fn(() => Promise.resolve(null)),
  selectExportFile: vi.fn(() => Promise.resolve(null)),
  selectWorkspaceDirectory: vi.fn(() => Promise.resolve(null)),
  writeExportFile: vi.fn(() => Promise.resolve()),
  writeWorkspaceFile: vi.fn(() => Promise.resolve()),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(() => Promise.resolve()),
}));

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
  window.localStorage.setItem(
    "onyxwriter.recentDrawers",
    JSON.stringify([{ path: "/tmp/Onyx-Test", name: "Onyx-Test", openedAt: "2026-06-16T21:00:00.000Z" }]),
  );
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("AppShell session restore", () => {
  it("restores open tabs and skips missing saved paths", async () => {
    window.localStorage.setItem(
      "onyxwriter.workspaceSessions",
      JSON.stringify({
        "/tmp/Onyx-Test": {
          rootPath: "/tmp/Onyx-Test",
          openPaths: ["orders.md", "missing.md", "customers.md"],
          activePath: "customers.md",
          updatedAt: "2026-06-16T21:00:00.000Z",
        },
      }),
    );
    const { AppShell } = await import("../AppShell");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(AppShell));
    });

    await waitFor(() => tabLabels(host).includes("Customers"));

    expect(tabLabels(host)).toEqual(["Orders", "Customers"]);
    expect(activeTabLabel(host)).toBe("Customers");
    expect(host.textContent).toContain("Skipped 1 missing saved tab");

    await act(async () => {
      root.unmount();
    });
  });
});

function activeTabLabel(host: HTMLElement): string {
  return host.querySelector(".document-tab.active .document-tab-label")?.textContent ?? "";
}

function tabLabels(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll(".document-tab-label")).map((item) => item.textContent ?? "");
}

async function waitFor(assertion: () => unknown): Promise<void> {
  for (let index = 0; index < 30; index += 1) {
    let result: unknown;
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 10));
      result = assertion();
    });
    if (result) return;
  }
  throw new Error("Timed out waiting for condition");
}
