import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceEntry } from "../../lib/workspace/types";

const files = new Map<string, string>();

const workspaceApi = vi.hoisted(() => ({
  createWorkspaceFolder: vi.fn(() => Promise.resolve()),
  createWorkspaceMarkdownFile: vi.fn((_: string, relativePath: string, contents: string) => {
    files.set(relativePath, contents);
    return Promise.resolve();
  }),
  deleteWorkspacePath: vi.fn(() => Promise.resolve()),
  directoryHasEntries: vi.fn(() => Promise.resolve(false)),
  initializeWorkspace: vi.fn(() => Promise.resolve()),
  inspectWorkspaceFolder: vi.fn(() =>
    Promise.resolve({ path: "/tmp/Onyx-Test", name: "Onyx-Test", entries: ["index.md"], projectMarkers: [], okfMarkers: ["index.md"], hasMarkdown: true }),
  ),
  isTauriRuntime: vi.fn(() => true),
  listWorkspace: vi.fn(() => Promise.resolve(tree)),
  moveWorkspacePath: vi.fn(() => Promise.resolve()),
  readWorkspaceFile: vi.fn((_: string, relativePath: string) => {
    const contents = files.get(relativePath);
    return contents === undefined ? Promise.reject(new Error(`Missing ${relativePath}`)) : Promise.resolve(contents);
  }),
  renameWorkspacePath: vi.fn(() => Promise.resolve("")),
  selectAndImportDrawerImage: vi.fn(() => Promise.resolve(null)),
  selectWorkspaceDirectory: vi.fn(() => Promise.resolve("/tmp/Onyx-Test")),
  writeWorkspaceFile: vi.fn((_: string, relativePath: string, contents: string) => {
    files.set(relativePath, contents);
    return Promise.resolve();
  }),
}));

vi.mock("../../lib/workspace/api", () => workspaceApi);

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(() => Promise.resolve()),
}));

vi.mock("../MermaidDiagram", () => ({
  MermaidDiagram: ({ source }: { source: string }) => React.createElement("div", { "data-testid": "mermaid" }, source),
}));

beforeEach(() => {
  files.clear();
  files.set("tables/orders.md", "---\ntype: Concept\ntitle: Orders\n---\n\n# Orders\n");
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
  vi.spyOn(window, "prompt").mockImplementation(() => {
    throw new Error("window.prompt should not be used for document actions.");
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("AppShell document actions", () => {
  it("creates folders through an app-owned dialog", async () => {
    const host = await renderOpenBundle();

    await act(async () => {
      buttonByLabel(host, "New folder").click();
    });
    await setDialogValue(host, "archive");
    await submitDialog(host);

    expect(workspaceApi.createWorkspaceFolder).toHaveBeenCalledWith("/tmp/Onyx-Test", "archive");
    expect(window.prompt).not.toHaveBeenCalled();
  });

  it("creates documents through an app-owned dialog", async () => {
    const host = await renderOpenBundle();

    await act(async () => {
      buttonByLabel(host, "New document").click();
    });
    await setDialogValue(host, "notes/alpha");
    await submitDialog(host);

    expect(workspaceApi.createWorkspaceMarkdownFile).toHaveBeenCalledWith(
      "/tmp/Onyx-Test",
      "notes/alpha.md",
      expect.stringContaining("New Concept"),
    );
    await waitFor(() => host.textContent?.includes("alpha.md"));
    expect(window.prompt).not.toHaveBeenCalled();
  });

  it("stages folder rename through an app-owned dialog", async () => {
    const host = await renderOpenBundle();

    await act(async () => {
      rowByTitle(host, "tables").click();
    });
    await act(async () => {
      buttonByLabel(host, "Rename").click();
    });
    await setDialogValue(host, "archive");
    await submitDialog(host);

    expect(host.textContent).toContain("tables");
    expect(host.textContent).toContain("archive");
    expect(host.textContent).toContain("Rename bundle item");
    expect(window.prompt).not.toHaveBeenCalled();
  });
});

async function renderOpenBundle(): Promise<HTMLDivElement> {
  const { AppShell } = await import("../AppShell");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(AppShell));
  });
  await act(async () => {
    buttonByLabel(host, "Open Bundle").click();
  });
  await waitFor(() => host.textContent?.includes("Onyx-Test"));
  return host;
}

async function setDialogValue(host: HTMLElement, value: string): Promise<void> {
  const input = host.querySelector(".path-input-field input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Path input not found.");
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submitDialog(host: HTMLElement): Promise<void> {
  await act(async () => {
    const button = findButtonByText(host, "Create") ?? findButtonByText(host, "Preview Rename");
    if (!button) throw new Error("Submit button not found.");
    button.click();
  });
}

function buttonByLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.getAttribute("aria-label") === label || item.getAttribute("title") === label);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return button;
}

function buttonByText(host: HTMLElement, text: string): HTMLButtonElement {
  const button = findButtonByText(host, text);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${text}`);
  return button;
}

function findButtonByText(host: HTMLElement, text: string): HTMLButtonElement | null {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent === text);
  return button instanceof HTMLButtonElement ? button : null;
}

function rowByTitle(host: HTMLElement, title: string): HTMLElement {
  const row = host.querySelector(`[title="${title}"]`);
  if (!(row instanceof HTMLElement)) throw new Error(`Row not found: ${title}`);
  return row;
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

const tree: WorkspaceEntry = {
  name: "Onyx-Test",
  path: "",
  kind: "folder",
  reserved: false,
  children: [
    {
      name: "tables",
      path: "tables",
      kind: "folder",
      reserved: false,
      children: [{ name: "orders.md", path: "tables/orders.md", kind: "file", reserved: false, children: [] }],
    },
  ],
};
