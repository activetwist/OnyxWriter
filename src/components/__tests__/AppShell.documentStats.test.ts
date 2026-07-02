import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
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
    { name: "logo.svg", path: "logo.svg", kind: "file", reserved: false, children: [] },
  ],
};

const files: Record<string, string> = {
  "orders.md": "---\ntype: Concept\ntitle: Orders\n---\n\n# Orders\n\nHello [Customers](customers.md).",
  "customers.md": "---\ntype: Concept\ntitle: Customers\n---\n\n# Customers\n\nSee [Orders](orders.md).",
};

vi.mock("../../lib/workspace/api", () => ({
  createEncryptedWorkspaceFile: vi.fn(),
  createEncryptedWorkspaceFolder: vi.fn(),
  createWorkspaceFolder: vi.fn(),
  createWorkspaceMarkdownFile: vi.fn(),
  deleteEncryptedWorkspacePath: vi.fn(),
  deleteWorkspacePath: vi.fn(),
  directoryHasEntries: vi.fn(() => Promise.resolve(false)),
  initializeWorkspace: vi.fn(),
  inspectWorkspaceFolder: vi.fn(() =>
    Promise.resolve({ path: "/tmp/Onyx-Test", name: "Onyx-Test", entries: ["index.md"], projectMarkers: [], okfMarkers: ["index.md"], hasMarkdown: true }),
  ),
  isEncryptedWorkspace: vi.fn(() => Promise.resolve({ protected: false, rootPath: "/tmp/Onyx-Test" })),
  isTauriRuntime: vi.fn(() => true),
  listEncryptedWorkspace: vi.fn(),
  listWorkspace: vi.fn(() => Promise.resolve(tree)),
  moveEncryptedWorkspacePath: vi.fn(),
  moveWorkspacePath: vi.fn(),
  readEncryptedWorkspaceFile: vi.fn(),
  readWorkspaceAsset: vi.fn(() => Promise.reject(new Error("Missing asset"))),
  readWorkspaceFile: vi.fn((_: string, relativePath: string) => {
    const contents = files[relativePath];
    if (contents === undefined) return Promise.reject(new Error(`Missing ${relativePath}`));
    return Promise.resolve(contents);
  }),
  renameEncryptedWorkspacePath: vi.fn(),
  renameWorkspacePath: vi.fn(),
  revealWorkspacePath: vi.fn(() => Promise.resolve()),
  selectAndImportDrawerImage: vi.fn(() => Promise.resolve(null)),
  selectExportFile: vi.fn(() => Promise.resolve(null)),
  selectWorkspaceDirectory: vi.fn(() => Promise.resolve(null)),
  writeEncryptedWorkspaceFile: vi.fn(),
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
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("AppShell document status stats", () => {
  it("renders active document link and text metrics in the status bar", async () => {
    window.localStorage.setItem(
      "onyxwriter.recentDrawers",
      JSON.stringify([{ path: "/tmp/Onyx-Test", name: "Onyx-Test", openedAt: "2026-06-16T21:00:00.000Z" }]),
    );
    window.localStorage.setItem(
      "onyxwriter.workspaceSessions",
      JSON.stringify({
        "/tmp/Onyx-Test": {
          rootPath: "/tmp/Onyx-Test",
          openPaths: ["orders.md"],
          activePath: "orders.md",
          updatedAt: "2026-06-16T21:00:00.000Z",
        },
      }),
    );

    const { root, host } = await renderAppShell();

    await waitFor(() => host.querySelector('[aria-label="Active document statistics"]')?.textContent?.includes("Links In: 1"));

    expect(host.querySelector('[aria-label="Active document statistics"]')?.textContent).toBe("Links In: 1 | Links Out: 1 | Words: 3 | Characters: 24");

    await unmount(root);
  });

  it("does not render document metrics when no document is active", async () => {
    const { root, host } = await renderAppShell();

    expect(host.querySelector('[aria-label="Active document statistics"]')).toBeNull();

    await unmount(root);
  });
});

async function renderAppShell(): Promise<{ root: Root; host: HTMLElement }> {
  const { AppShell } = await import("../AppShell");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(React.createElement(AppShell));
  });

  return { root, host };
}

async function unmount(root: Root): Promise<void> {
  await act(async () => {
    root.unmount();
  });
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
