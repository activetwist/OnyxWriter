import type { Editor } from "@tiptap/react";
import { lazy, Suspense, useEffect } from "react";
import { parseOkfDocument } from "../lib/okf";
import type { EditorMode, OpenDocumentState } from "../lib/state/workspaceStore";

interface EditorPaneProps {
  document: OpenDocumentState | null;
  mode: EditorMode;
  onChange: (raw: string) => void;
  onOpenLink?: (href: string) => void;
  onVisualEditorChange?: (editor: Editor | null) => void;
}

const VisualEditorSurface = lazy(() => import("./VisualEditorSurface").then((module) => ({ default: module.VisualEditorSurface })));
const RawEditorSurface = lazy(() => import("./RawEditorSurface").then((module) => ({ default: module.RawEditorSurface })));

export function EditorPane({ document, mode, onChange, onOpenLink, onVisualEditorChange }: EditorPaneProps) {
  useEffect(() => {
    if (mode !== "visual") onVisualEditorChange?.(null);
  }, [mode, onVisualEditorChange]);

  if (!document) {
    return (
      <main className="editor-empty">
        <h2>Select a document</h2>
      </main>
    );
  }

  return (
    <main className="editor-pane">
      <div className="document-title-row">
        <div>
          <span className="eyebrow">{document.path}</span>
          <h2>{titleFromRaw(document.path, document.raw)}</h2>
        </div>
      </div>
      {mode === "visual" ? (
        <Suspense fallback={<div className="surface-loading">Loading visual editor.</div>}>
          <VisualEditorSurface document={document} onChange={onChange} onOpenLink={onOpenLink} onVisualEditorChange={onVisualEditorChange} />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="surface-loading">Loading raw editor.</div>}>
          <RawEditorSurface raw={document.raw} onChange={onChange} />
        </Suspense>
      )}
    </main>
  );
}

function titleFromRaw(path: string, raw: string): string {
  try {
    const doc = parseOkfDocument(path, raw);
    const title = doc.frontmatter.title;
    return typeof title === "string" && title.trim() ? title : path.split("/").pop() ?? path;
  } catch {
    return path.split("/").pop() ?? path;
  }
}
