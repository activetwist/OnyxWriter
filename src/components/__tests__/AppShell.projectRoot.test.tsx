import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceEntry } from "../../lib/workspace/types";

const workspaceApi = vi.hoisted(() => ({
  createWorkspaceFolder: vi.fn(() => Promise.resolve()),
  createWorkspaceMarkdownFile: vi.fn(() => Promise.resolve()),
  deleteWorkspacePath: vi.fn(() => Promise.resolve()),
  directoryHasEntries: vi.fn(() => Promise.resolve(false)),
  initializeWorkspace: vi.fn(() => Promise.resolve()),
  inspectWorkspaceFolder: vi.fn(() =>
    Promise.resolve({
      path: "/tmp/project",
      name: "project",
      entries: [".git", "package.json"],
      projectMarkers: [".git", "package.json"],
      okfMarkers: [],
      hasMarkdown: false,
    }),
  ),
  isEncryptedWorkspace: vi.fn(() => Promise.resolve({ protected: false, rootPath: "/tmp/Onyx-Test" })),
  isTauriRuntime: vi.fn(() => true),
  listWorkspace: vi.fn(() => Promise.resolve(tree)),
  moveWorkspacePath: vi.fn(() => Promise.resolve()),
  readWorkspaceAsset: vi.fn(() => Promise.reject(new Error("Missing asset"))),
  readWorkspaceFile: vi.fn(() => Promise.resolve("---\ntype: Concept\n---\n\n# Test\n")),
  renameWorkspacePath: vi.fn(() => Promise.resolve("")),
  revealWorkspacePath: vi.fn(() => Promise.resolve()),
  selectAndImportDrawerImage: vi.fn(() => Promise.resolve(null)),
  selectExportFile: vi.fn(() => Promise.resolve(null)),
  selectWorkspaceDirectory: vi.fn(() => Promise.resolve("/tmp/project")),
  writeExportFile: vi.fn(() => Promise.resolve()),
  writeWorkspaceFile: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../lib/workspace/api", () => workspaceApi);

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
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("AppShell project-root safeguards", () => {
  it("warns before opening a likely code project root as a bundle", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const host = await renderShell();

    await act(async () => {
      buttonByLabel(host, "Open Bundle").click();
    });

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("looks like a code project"));
    expect(workspaceApi.listWorkspace).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Open canceled");
  });

  it("creates a nested bundle inside a likely code project", async () => {
    const host = await renderShell();

    await act(async () => {
      buttonByLabel(host, "Create Bundle").click();
    });
    expect(host.textContent).toContain("Create bundle inside project");

    await act(async () => {
      const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent?.includes("Create Bundle"));
      if (!(button instanceof HTMLButtonElement)) throw new Error("Create Bundle submit not found.");
      button.click();
    });

    expect(workspaceApi.createWorkspaceFolder).toHaveBeenCalledWith("/tmp/project", "docs/okf");
    expect(workspaceApi.initializeWorkspace).toHaveBeenCalledWith("/tmp/project/docs/okf", "Onyx Bundle");
    expect(workspaceApi.listWorkspace).toHaveBeenCalledWith("/tmp/project/docs/okf");
  });
});

async function renderShell(): Promise<HTMLDivElement> {
  const { AppShell } = await import("../AppShell");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(AppShell));
  });
  return host;
}

function buttonByLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.getAttribute("aria-label") === label || item.getAttribute("title") === label);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return button;
}

const tree: WorkspaceEntry = {
  name: "okf",
  path: "",
  kind: "folder",
  reserved: false,
  children: [{ name: "index.md", path: "index.md", kind: "file", reserved: true, children: [] }],
};
