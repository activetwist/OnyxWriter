import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceEntry } from "../../lib/workspace/types";

const svgBytes = bytes("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 10 10\"><circle cx=\"5\" cy=\"5\" r=\"4\"/></svg>");
const pngBytes = [137, 80, 78, 71, 13, 10, 26, 10];

const workspaceApi = vi.hoisted(() => ({
  createWorkspaceFolder: vi.fn(() => Promise.resolve()),
  createWorkspaceMarkdownFile: vi.fn(() => Promise.resolve()),
  deleteWorkspacePath: vi.fn(() => Promise.resolve()),
  directoryHasEntries: vi.fn(() => Promise.resolve(false)),
  initializeWorkspace: vi.fn(() => Promise.resolve()),
  inspectWorkspaceFolder: vi.fn(() =>
    Promise.resolve({ path: "/tmp/Onyx-Test", name: "Onyx-Test", entries: ["index.md"], projectMarkers: [], okfMarkers: ["index.md"], hasMarkdown: true }),
  ),
  isTauriRuntime: vi.fn(() => true),
  listWorkspace: vi.fn(() => Promise.resolve(tree)),
  moveWorkspacePath: vi.fn(() => Promise.resolve()),
  readWorkspaceAsset: vi.fn((_: string, relativePath: string) => {
    if (relativePath.endsWith(".svg")) return Promise.resolve({ mimeType: "image/svg+xml", data: svgBytes });
    if (relativePath.endsWith(".png")) return Promise.resolve({ mimeType: "image/png", data: pngBytes });
    return Promise.reject(new Error(`Missing asset ${relativePath}`));
  }),
  readWorkspaceFile: vi.fn(() => Promise.reject(new Error("Markdown should not be read for image preview."))),
  renameWorkspacePath: vi.fn(() => Promise.resolve("")),
  revealWorkspacePath: vi.fn(() => Promise.resolve()),
  selectAndImportDrawerImage: vi.fn(() => Promise.resolve(null)),
  selectExportFile: vi.fn(() => Promise.resolve(null)),
  selectWorkspaceDirectory: vi.fn(() => Promise.resolve("/tmp/Onyx-Test")),
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
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("AppShell image preview", () => {
  it("loads SVG and raster previews through the workspace asset API", async () => {
    const host = await renderOpenBundle();

    await act(async () => {
      rowByTitle(host, "assets/images/diagram.svg").click();
    });

    await waitFor(() => host.querySelector('img[src^="data:image/svg+xml;base64,"]'));
    expect(workspaceApi.readWorkspaceAsset).toHaveBeenCalledWith("/tmp/Onyx-Test", "assets/images/diagram.svg");
    expect(workspaceApi.readWorkspaceFile).not.toHaveBeenCalled();

    await act(async () => {
      rowByTitle(host, "assets/images/pixel.png").click();
    });

    await waitFor(() => host.querySelector('img[src^="data:image/png;base64,"]'));
    expect(workspaceApi.readWorkspaceAsset).toHaveBeenCalledWith("/tmp/Onyx-Test", "assets/images/pixel.png");
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

function buttonByLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.getAttribute("aria-label") === label || item.getAttribute("title") === label);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return button;
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

function bytes(value: string): number[] {
  return Array.from(value).map((character) => character.charCodeAt(0));
}

const tree: WorkspaceEntry = {
  name: "Onyx-Test",
  path: "",
  kind: "folder",
  reserved: false,
  children: [
    {
      name: "assets",
      path: "assets",
      kind: "folder",
      reserved: false,
      children: [
        {
          name: "images",
          path: "assets/images",
          kind: "folder",
          reserved: false,
          children: [
            { name: "diagram.svg", path: "assets/images/diagram.svg", kind: "file", fileType: "image", reserved: false, children: [] },
            { name: "pixel.png", path: "assets/images/pixel.png", kind: "file", fileType: "image", reserved: false, children: [] },
          ],
        },
      ],
    },
  ],
};
