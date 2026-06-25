import type { Editor } from "@tiptap/react";
import { lazy, Suspense, useEffect } from "react";
import type { LinkSuggestion } from "./EditorToolbar";
import type { EditorMode, OpenDocumentState } from "../lib/state/workspaceStore";

interface EditorPaneProps {
  document: OpenDocumentState | null;
  mode: EditorMode;
  onChange: (raw: string) => void;
  onOpenLink?: (href: string) => void;
  onVisualEditorChange?: (editor: Editor | null) => void;
  linkSuggestions?: LinkSuggestion[];
}

const VisualEditorSurface = lazy(() => import("./VisualEditorSurface").then((module) => ({ default: module.VisualEditorSurface })));
const RawEditorSurface = lazy(() => import("./RawEditorSurface").then((module) => ({ default: module.RawEditorSurface })));

export function EditorPane({ document, mode, onChange, onOpenLink, onVisualEditorChange, linkSuggestions = [] }: EditorPaneProps) {
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
        <span className="eyebrow">{document.path}</span>
      </div>
      {mode === "visual" ? (
        <Suspense fallback={<div className="surface-loading">Loading visual editor.</div>}>
          <VisualEditorSurface
            document={document}
            onChange={onChange}
            onOpenLink={onOpenLink}
            onVisualEditorChange={onVisualEditorChange}
            linkSuggestions={linkSuggestions}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="surface-loading">Loading raw editor.</div>}>
          <RawEditorSurface raw={document.raw} onChange={onChange} />
        </Suspense>
      )}
    </main>
  );
}
