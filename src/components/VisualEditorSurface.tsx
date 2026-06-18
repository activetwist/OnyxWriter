import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";
import { markdownToVisual, visualHtmlToMarkdown } from "../lib/editor/markdownBridge";
import { extractMermaidBlocks } from "../lib/editor/mermaidBlocks";
import { tiptapExtensions } from "../lib/editor/tiptap";
import { parseOkfDocument, serializeOkfDocument } from "../lib/okf";
import type { OpenDocumentState } from "../lib/state/workspaceStore";
import { MermaidDiagram } from "./MermaidDiagram";

interface VisualEditorSurfaceProps {
  document: OpenDocumentState;
  onChange: (raw: string) => void;
  onOpenLink?: (href: string) => void;
  onVisualEditorChange?: (editor: Editor | null) => void;
}

export function VisualEditorSurface({ document, onChange, onOpenLink, onVisualEditorChange }: VisualEditorSurfaceProps) {
  const parsed = useMemo(() => parseOkfDocument(document.path, document.raw), [document.path, document.raw]);
  const visual = useMemo(() => markdownToVisual(parsed.body), [parsed.body]);
  const mermaidBlocks = useMemo(() => extractMermaidBlocks(parsed.body), [parsed.body]);

  if (visual.rawModeRecommended) {
    return (
      <div className="visual-editor">
        <div className="raw-recommended">
          <strong>Raw mode required.</strong>
          <span>This document contains Markdown that the visual editor will not rewrite: {visual.capabilityReport.warnings.map((warning) => warning.code).join(", ")}.</span>
        </div>
        {mermaidBlocks.length ? (
          <div className="mermaid-preview-list">
            {mermaidBlocks.map((block) => (
              <MermaidDiagram key={`${document.path}-${block.id}-${block.startLine}`} id={`${document.path}-${block.id}`} source={block.source} />
            ))}
          </div>
        ) : null}
        {visual.html ? <StaticVisualPreview html={visual.html} onOpenLink={onOpenLink} /> : null}
      </div>
    );
  }

  return (
    <div className="visual-editor">
      {mermaidBlocks.length ? (
        <div className="mermaid-preview-list">
          {mermaidBlocks.map((block) => (
            <MermaidDiagram key={`${document.path}-${block.id}-${block.startLine}`} id={`${document.path}-${block.id}`} source={block.source} />
          ))}
        </div>
      ) : null}
      <TiptapEditorSurface
        documentKey={document.path}
        html={visual.html}
        sourceRaw={document.raw}
        onOpenLink={onOpenLink}
        onVisualEditorChange={onVisualEditorChange}
        onUpdate={(html) => {
          const body = visualHtmlToMarkdown(html);
          const raw = serializeOkfDocument({ frontmatter: parsed.frontmatter, body });
          onChange(raw);
          return raw;
        }}
      />
    </div>
  );
}

function TiptapEditorSurface({
  documentKey,
  html,
  sourceRaw,
  onOpenLink,
  onUpdate,
  onVisualEditorChange,
}: {
  documentKey: string;
  html: string;
  sourceRaw: string;
  onOpenLink?: (href: string) => void;
  onUpdate: (html: string) => string;
  onVisualEditorChange?: (editor: Editor | null) => void;
}) {
  const onUpdateRef = useRef(onUpdate);
  const documentKeyRef = useRef(documentKey);
  const lastLocalRawRef = useRef<{ documentKey: string; raw: string } | null>(null);
  const syncedDocumentKeyRef = useRef(documentKey);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    documentKeyRef.current = documentKey;
  }, [documentKey]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: tiptapExtensions,
      content: html,
      editable: true,
      editorProps: {
        attributes: {
          class: "tiptap-surface",
        },
        handleClickOn: (_view, _pos, node, _nodePos, event) => {
          const target = event.target;
          const anchor = target instanceof Element ? target.closest("a[href]") : null;
          const href = anchor?.getAttribute("href");
          if (!href || !onOpenLink) return false;
          event.preventDefault();
          event.stopPropagation();
          onOpenLink(href);
          return true;
        },
        handleDOMEvents: {
          click: (_view, event) => {
            const target = event.target;
            const anchor = target instanceof Element ? target.closest("a[href]") : null;
            const href = anchor?.getAttribute("href");
            if (!href || !onOpenLink) return false;
            event.preventDefault();
            event.stopPropagation();
            onOpenLink(href);
            return true;
          },
        },
      },
      onUpdate: ({ editor }) => {
        const raw = onUpdateRef.current(editor.getHTML());
        lastLocalRawRef.current = { documentKey: documentKeyRef.current, raw };
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor) return;

    if (syncedDocumentKeyRef.current !== documentKey) {
      syncedDocumentKeyRef.current = documentKey;
      lastLocalRawRef.current = null;
    } else if (lastLocalRawRef.current?.documentKey === documentKey && lastLocalRawRef.current.raw === sourceRaw) {
      return;
    }

    lastLocalRawRef.current = null;
    if (editor.getHTML() !== html) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [documentKey, editor, html, sourceRaw]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(true);
    onVisualEditorChange?.(editor);
    return () => onVisualEditorChange?.(null);
  }, [editor, onVisualEditorChange]);

  return <EditorContent editor={editor} />;
}

function StaticVisualPreview({ html, onOpenLink }: { html: string; onOpenLink?: (href: string) => void }) {
  return (
    <div
      className="tiptap-surface static-visual-preview"
      onClick={(event) => {
        const target = event.target;
        const anchor = target instanceof Element ? target.closest("a[href]") : null;
        const href = anchor?.getAttribute("href");
        if (!href || !onOpenLink) return;
        event.preventDefault();
        event.stopPropagation();
        onOpenLink(href);
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
