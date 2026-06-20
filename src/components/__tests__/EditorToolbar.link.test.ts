import type { Editor } from "@tiptap/react";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorToolbar } from "../EditorToolbar";

beforeEach(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
  Object.defineProperty(window, "requestAnimationFrame", { value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0), configurable: true });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("EditorToolbar link authoring", () => {
  it("calls the refresh handler from the utility toolbar", async () => {
    const editor = createEditorMock();
    const onRefresh = vi.fn();
    const host = await renderToolbar(editor.instance, [], { onRefresh });

    await act(async () => {
      button(host, "Refresh bundle")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("adds a link without using window.prompt", async () => {
    const prompt = vi.spyOn(window, "prompt").mockImplementation(() => {
      throw new Error("prompt should not be used");
    });
    const editor = createEditorMock({ selection: { from: 2, to: 8 } });
    const host = await renderToolbar(editor.instance);

    await act(async () => {
      button(host, "Add or edit link")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    await changeInput(host, "../tables/orders.md");
    await submitForm(host);

    expect(prompt).not.toHaveBeenCalled();
    expect(editor.chain.setTextSelection).toHaveBeenCalledWith({ from: 2, to: 8 });
    expect(editor.chain.extendMarkRange).toHaveBeenCalledWith("link");
    expect(editor.chain.setLink).toHaveBeenCalledWith({ href: "../tables/orders.md" });
    expect(editor.chain.run).toHaveBeenCalled();
  });

  it("preloads and edits the active link href", async () => {
    const editor = createEditorMock({ href: "old.md", isLinkActive: true, selection: { from: 4, to: 4 } });
    const host = await renderToolbar(editor.instance);

    await act(async () => {
      button(host, "Add or edit link")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(input(host)?.value).toBe("old.md");
    await changeInput(host, "mailto:team@example.com");
    await submitForm(host);

    expect(editor.chain.setTextSelection).toHaveBeenCalledWith({ from: 4, to: 4 });
    expect(editor.chain.setLink).toHaveBeenCalledWith({ href: "mailto:team@example.com" });
  });

  it("removes the active link from the toolbar", async () => {
    const editor = createEditorMock({ href: "customers.md", isLinkActive: true });
    const host = await renderToolbar(editor.instance);

    await act(async () => {
      button(host, "Remove link")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(editor.chain.extendMarkRange).toHaveBeenCalledWith("link");
    expect(editor.chain.unsetLink).toHaveBeenCalled();
    expect(editor.chain.run).toHaveBeenCalled();
  });

  it("offers local document suggestions in the link input", async () => {
    const editor = createEditorMock({ selection: { from: 2, to: 8 } });
    const host = await renderToolbar(editor.instance, [
      { href: "../../tables/orders.md", path: "tables/orders.md" },
      { href: "../marketing/campaign-attribution.md", path: "domains/marketing/campaign-attribution.md" },
    ]);

    await act(async () => {
      button(host, "Add or edit link")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(input(host)?.getAttribute("list")).toBe("onyx-link-suggestions");
    expect(Array.from(host.querySelectorAll("datalist option")).map((option) => option.getAttribute("value"))).toEqual([
      "../../tables/orders.md",
      "../marketing/campaign-attribution.md",
    ]);
    expect(Array.from(host.querySelectorAll("datalist option")).map((option) => option.getAttribute("label"))).toEqual([
      "tables/orders.md",
      "domains/marketing/campaign-attribution.md",
    ]);
  });

  it("opens the link editor from a command request", async () => {
    const editor = createEditorMock({ href: "existing.md", selection: { from: 3, to: 9 } });
    const host = await renderToolbar(editor.instance, [], { commandRequest: { id: 1, command: "editor.link" } });

    expect(input(host)?.value).toBe("existing.md");
  });

  it("runs visual formatting from a command request", async () => {
    const editor = createEditorMock();
    await renderToolbar(editor.instance, [], { commandRequest: { id: 1, command: "editor.bold" } });

    expect(editor.chain.toggleBold).toHaveBeenCalled();
    expect(editor.chain.run).toHaveBeenCalled();
  });
});

async function renderToolbar(
  editor: Editor,
  linkSuggestions: Array<{ href: string; path: string }> = [],
  overrides: Partial<React.ComponentProps<typeof EditorToolbar>> = {},
): Promise<HTMLDivElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const onRefresh = vi.fn();
  const root = createRoot(host);
  await act(async () => {
    root.render(
      React.createElement(EditorToolbar, {
        mode: "visual",
        dirty: false,
        saveStatus: "saved",
        canSave: true,
        canRefresh: true,
        refreshBusy: false,
        visualEditor: editor,
        canInsertImage: true,
        canOpenGraph: true,
        graphOpen: false,
        onModeChange: vi.fn(),
        onRefresh,
        onSave: vi.fn(),
        onInsertImage: vi.fn(),
        onToggleGraph: vi.fn(),
        linkSuggestions,
        ...overrides,
      }),
    );
  });
  return host;
}

async function changeInput(host: HTMLElement, value: string): Promise<void> {
  const field = input(host);
  expect(field).not.toBeNull();
  await act(async () => {
    field!.value = value;
    field!.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  });
}

async function submitForm(host: HTMLElement): Promise<void> {
  const form = host.querySelector("form");
  expect(form).not.toBeNull();
  await act(async () => {
    form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

function button(host: HTMLElement, label: string): HTMLButtonElement | null {
  return host.querySelector(`button[aria-label="${label}"]`);
}

function input(host: HTMLElement): HTMLInputElement | null {
  return host.querySelector(".link-editor-popover input");
}

function createEditorMock({
  href,
  isLinkActive = false,
  selection = { from: 1, to: 1 },
}: {
  href?: string;
  isLinkActive?: boolean;
  selection?: { from: number; to: number };
} = {}) {
  const chain = {
    focus: vi.fn(() => chain),
    setTextSelection: vi.fn(() => chain),
    extendMarkRange: vi.fn(() => chain),
    setLink: vi.fn(() => chain),
    unsetLink: vi.fn(() => chain),
    setParagraph: vi.fn(() => chain),
    toggleHeading: vi.fn(() => chain),
    toggleBold: vi.fn(() => chain),
    toggleItalic: vi.fn(() => chain),
    toggleCode: vi.fn(() => chain),
    toggleBulletList: vi.fn(() => chain),
    toggleOrderedList: vi.fn(() => chain),
    insertTable: vi.fn(() => chain),
    undo: vi.fn(() => chain),
    redo: vi.fn(() => chain),
    run: vi.fn(() => true),
  };
  const instance = {
    isEditable: true,
    state: { selection },
    on: vi.fn(),
    off: vi.fn(),
    can: vi.fn(() => ({ undo: vi.fn(() => false), redo: vi.fn(() => false) })),
    chain: vi.fn(() => chain),
    isActive: vi.fn((name: string) => name === "link" && isLinkActive),
    getAttributes: vi.fn((name: string) => (name === "link" ? { href } : {})),
  } as unknown as Editor;
  return { instance, chain };
}
