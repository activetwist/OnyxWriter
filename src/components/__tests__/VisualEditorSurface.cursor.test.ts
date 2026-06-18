import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VisualEditorSurface } from "../VisualEditorSurface";

const tiptapMock = vi.hoisted(() => ({
  options: null as null | { onUpdate: (payload: { editor: FakeEditor }) => void },
  editor: null as null | FakeEditor,
  useEditor: vi.fn(),
}));

vi.mock("@tiptap/react", () => ({
  useEditor: tiptapMock.useEditor,
  EditorContent: ({ editor }: { editor: FakeEditor | null }) => React.createElement("div", { "data-testid": "editor", "data-ready": Boolean(editor) }),
}));

vi.mock("../MermaidDiagram", () => ({
  MermaidDiagram: ({ source }: { source: string }) => React.createElement("div", { "data-testid": "mermaid" }, source),
}));

interface FakeEditor {
  getHTML: () => string;
  commands: {
    setContent: ReturnType<typeof vi.fn>;
  };
  setEditable: ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
  tiptapMock.options = null;
  tiptapMock.editor = createFakeEditor("<p>Hello world</p>");
  tiptapMock.useEditor.mockImplementation((options) => {
    tiptapMock.options = options;
    return tiptapMock.editor;
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("VisualEditorSurface cursor stability", () => {
  it("does not replace TipTap content for self-originated visual edits", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const onChange = vi.fn();
    const initialDocument = {
      path: "notes/hello.md",
      raw: documentRaw("Hello", "Hello world"),
      dirty: false,
      validation: { errors: [], warnings: [], notices: [] },
    };

    await act(async () => {
      root.render(React.createElement(VisualEditorSurface, { document: initialDocument, onChange }));
    });

    expect(tiptapMock.editor?.commands.setContent).not.toHaveBeenCalled();

    tiptapMock.editor = {
      ...tiptapMock.editor!,
      getHTML: () => "<p>Hello <strong>brave</strong> world</p><p></p>",
    };

    await act(async () => {
      tiptapMock.options?.onUpdate({ editor: tiptapMock.editor! });
    });

    const emittedRaw = onChange.mock.calls[0]?.[0] as string;
    expect(emittedRaw).toContain("Hello **brave** world");

    await act(async () => {
      root.render(React.createElement(VisualEditorSurface, { document: { ...initialDocument, raw: emittedRaw, dirty: true }, onChange }));
    });

    expect(tiptapMock.editor?.commands.setContent).not.toHaveBeenCalled();

    await act(async () => {
      root.render(React.createElement(VisualEditorSurface, { document: { ...initialDocument, raw: documentRaw("Hello", "External edit"), dirty: true }, onChange }));
    });

    expect(tiptapMock.editor?.commands.setContent).toHaveBeenCalledWith("<p>External edit</p>", { emitUpdate: false });
    tiptapMock.editor?.commands.setContent.mockClear();

    await act(async () => {
      root.render(React.createElement(VisualEditorSurface, { document: { ...initialDocument, raw: emittedRaw, dirty: true }, onChange }));
    });

    expect(tiptapMock.editor?.commands.setContent).toHaveBeenCalledWith("<p>Hello <strong>brave</strong> world</p>", { emitUpdate: false });

    await act(async () => root.unmount());
  });
});

function createFakeEditor(html: string): FakeEditor {
  return {
    getHTML: () => html,
    commands: {
      setContent: vi.fn(),
    },
    setEditable: vi.fn(),
  };
}

function documentRaw(title: string, body: string): string {
  return ["---", "type: Concept", `title: ${title}`, "description: Cursor test.", "tags: []", "timestamp: 2026-06-15T00:00:00Z", "---", "", body, ""].join("\n");
}
