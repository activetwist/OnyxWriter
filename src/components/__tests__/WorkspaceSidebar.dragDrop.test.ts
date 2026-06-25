import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSidebar } from "../WorkspaceSidebar";
import type { WorkspaceEntry } from "../../lib/workspace/types";

beforeEach(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("WorkspaceSidebar drag and drop", () => {
  it("moves a document into a folder drop target", async () => {
    const onMovePath = vi.fn();
    const host = await renderSidebar({ onMovePath });

    await pointerDrag(dragTarget(host, "tables/orders.md"), rowForPath(host, "archive"));

    expect(onMovePath).toHaveBeenCalledWith("tables/orders.md", "archive");
  });

  it("marks folders as pointer drop targets while dragging", async () => {
    const host = await renderSidebar({});
    const archiveRow = rowForPath(host, "archive");

    await act(async () => {
      dragTarget(host, "tables/orders.md").dispatchEvent(pointerEvent("pointerdown", { button: 0, clientX: 10, clientY: 10 }));
    });
    await act(async () => {
      window.dispatchEvent(pointerEvent("pointermove", { button: 0, clientX: 20, clientY: 20 }));
    });
    await act(async () => {
      archiveRow.dispatchEvent(pointerEvent("pointerover", { button: 0, clientX: 20, clientY: 20 }));
    });

    expect(archiveRow.className).toContain("drop-target");
  });

  it("uses pointer coordinates to resolve folder drop targets", async () => {
    const onMovePath = vi.fn();
    const host = await renderSidebar({ onMovePath });
    const archiveRow = rowForPath(host, "archive");
    Object.defineProperty(document, "elementFromPoint", { value: vi.fn(() => archiveRow), configurable: true });

    await pointerDrag(dragTarget(host, "tables/orders.md"), archiveRow, { skipPointerOver: true });

    expect(onMovePath).toHaveBeenCalledWith("tables/orders.md", "archive");
  });

  it("moves a folder to the bundle root", async () => {
    const onMovePath = vi.fn();
    const host = await renderSidebar({ onMovePath });

    const rootDrop = host.querySelector("nav.tree");
    if (!(rootDrop instanceof HTMLElement)) throw new Error("Root drop target not found.");
    Object.defineProperty(document, "elementFromPoint", { value: vi.fn(() => rootDrop), configurable: true });
    await pointerDrag(dragTarget(host, "archive"), rootDrop);

    expect(onMovePath).toHaveBeenCalledWith("archive", "");
  });

  it("does not move a folder into itself", async () => {
    const onMovePath = vi.fn();
    const host = await renderSidebar({ onMovePath });
    const archiveRow = rowForPath(host, "archive");
    Object.defineProperty(document, "elementFromPoint", { value: vi.fn(() => archiveRow), configurable: true });

    await pointerDrag(dragTarget(host, "archive"), archiveRow);

    expect(onMovePath).not.toHaveBeenCalled();
  });

  it("keeps disclosure toggles separate from drag and selection", async () => {
    const onToggleFolder = vi.fn();
    const onSelectPath = vi.fn();
    const onMovePath = vi.fn();
    const host = await renderSidebar({ onMovePath, onSelectPath, onToggleFolder });

    await act(async () => {
      buttonByLabel(host, "Collapse tables").click();
    });

    expect(onToggleFolder).toHaveBeenCalledWith("tables");
    expect(onSelectPath).not.toHaveBeenCalled();
    expect(onMovePath).not.toHaveBeenCalled();
  });

  it("selects folders without toggling them from the row label", async () => {
    const onToggleFolder = vi.fn();
    const onSelectEntry = vi.fn();
    const host = await renderSidebar({ onSelectEntry, onToggleFolder });

    await act(async () => {
      dragTarget(host, "tables").click();
    });

    expect(onSelectEntry).toHaveBeenCalledWith("tables");
    expect(onToggleFolder).not.toHaveBeenCalled();
  });

  it("selects and opens documents from the row label", async () => {
    const onSelectPath = vi.fn();
    const onSelectEntry = vi.fn();
    const host = await renderSidebar({ onSelectEntry, onSelectPath });

    await act(async () => {
      dragTarget(host, "tables/orders.md").click();
    });

    expect(onSelectEntry).toHaveBeenCalledWith("tables/orders.md");
    expect(onSelectPath).toHaveBeenCalledWith("tables/orders.md");
  });

  it("does not make reserved system files draggable", async () => {
    const host = await renderSidebar({ showSystemFiles: true });
    expect(dragTarget(host, "index.md").dataset.draggable).toBe("false");
  });
});

async function renderSidebar({
  onMovePath = vi.fn(),
  onSelectPath = vi.fn(),
  onSelectEntry = vi.fn(),
  onToggleFolder = vi.fn(),
  showSystemFiles = false,
}: {
  onMovePath?: (sourcePath: string, destinationFolderPath: string) => void;
  onSelectPath?: (path: string) => void;
  onSelectEntry?: (path: string) => void;
  onToggleFolder?: (path: string) => void;
  showSystemFiles?: boolean;
}): Promise<HTMLDivElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      React.createElement(WorkspaceSidebar, {
        rootPath: "/tmp/Onyx-Test",
        bundleName: "Onyx-Test",
        tree,
        selectedPath: "",
        canMutateDocuments: true,
        collapsed: false,
        collapsedFolders: new Set<string>(),
        allFoldersCollapsed: false,
        recentWorkspaces: [],
        showSystemFiles,
        onOpenWorkspace: vi.fn(),
        onCreateWorkspace: vi.fn(),
        onOpenRecentWorkspace: vi.fn(),
        onSelectPath,
        onSelectEntry,
        onToggleCollapsed: vi.fn(),
        onToggleFolder,
        onToggleFoldAll: vi.fn(),
        onCreateFile: vi.fn(),
        onCreateFolder: vi.fn(),
        onRename: vi.fn(),
        onDelete: vi.fn(),
        onMovePath,
        onOpenSplitView: vi.fn(),
        onOpenSettings: vi.fn(),
      }),
    );
  });
  return host;
}

function dragTarget(host: HTMLElement, path: string): HTMLElement {
  const target = host.querySelector(`.tree-row-main[title="${path}"]`);
  if (!(target instanceof HTMLElement)) throw new Error(`Drag target not found: ${path}`);
  return target;
}

function rowForPath(host: HTMLElement, path: string): HTMLElement {
  const target = dragTarget(host, path).closest(".tree-row");
  if (!(target instanceof HTMLElement)) throw new Error(`Row not found: ${path}`);
  return target;
}

async function pointerDrag(source: HTMLElement, target: HTMLElement, options: { skipPointerOver?: boolean } = {}): Promise<void> {
  await act(async () => {
    source.dispatchEvent(pointerEvent("pointerdown", { button: 0, clientX: 10, clientY: 10 }));
  });
  await act(async () => {
    window.dispatchEvent(pointerEvent("pointermove", { button: 0, clientX: 20, clientY: 20 }));
  });
  if (!options.skipPointerOver) {
    await act(async () => {
      target.dispatchEvent(pointerEvent("pointerover", { button: 0, clientX: 20, clientY: 20 }));
    });
  }
  await act(async () => {
    window.dispatchEvent(pointerEvent("pointerup", { button: 0, clientX: 20, clientY: 20 }));
  });
}

function buttonByLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = host.querySelector(`button[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return button;
}

function pointerEvent(type: string, init: { button: number; clientX: number; clientY: number }): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "button", { value: init.button });
  Object.defineProperty(event, "clientX", { value: init.clientX });
  Object.defineProperty(event, "clientY", { value: init.clientY });
  return event;
}

const tree: WorkspaceEntry = {
  name: "Onyx-Test",
  path: "",
  kind: "folder",
  reserved: false,
  children: [
    { name: "index.md", path: "index.md", kind: "file", reserved: true, children: [] },
    {
      name: "tables",
      path: "tables",
      kind: "folder",
      reserved: false,
      children: [{ name: "orders.md", path: "tables/orders.md", kind: "file", reserved: false, children: [] }],
    },
    { name: "archive", path: "archive", kind: "folder", reserved: false, children: [] },
  ],
};
