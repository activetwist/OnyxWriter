import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { markdownToVisual, visualHtmlToMarkdown } from "../lib/editor/markdownBridge";
import { extractMermaidBlocks } from "../lib/editor/mermaidBlocks";
import { tiptapExtensions } from "../lib/editor/tiptap";
import { parseOkfDocument, serializeOkfDocument } from "../lib/okf";
import type { OpenDocumentState } from "../lib/state/workspaceStore";
import { MermaidDiagram } from "./MermaidDiagram";
import type { LinkSuggestion } from "./EditorToolbar";

interface VisualEditorSurfaceProps {
  document: OpenDocumentState;
  onChange: (raw: string) => void;
  onOpenLink?: (href: string) => void;
  onVisualEditorChange?: (editor: Editor | null) => void;
  linkSuggestions?: LinkSuggestion[];
}

export function VisualEditorSurface({ document, onChange, onOpenLink, onVisualEditorChange, linkSuggestions = [] }: VisualEditorSurfaceProps) {
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
        linkSuggestions={linkSuggestions}
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
  linkSuggestions,
}: {
  documentKey: string;
  html: string;
  sourceRaw: string;
  onOpenLink?: (href: string) => void;
  onUpdate: (html: string) => string;
  onVisualEditorChange?: (editor: Editor | null) => void;
  linkSuggestions: LinkSuggestion[];
}) {
  const onUpdateRef = useRef(onUpdate);
  const documentKeyRef = useRef(documentKey);
  const lastLocalRawRef = useRef<{ documentKey: string; raw: string } | null>(null);
  const syncedDocumentKeyRef = useRef(documentKey);
  const [wikiLink, setWikiLink] = useState<{ open: boolean; from: number; query: string }>({ open: false, from: 0, query: "" });

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
          keydown: (_view, event) => {
            if (event.key === "Escape" && wikiLink.open) {
              setWikiLink({ open: false, from: 0, query: "" });
              return true;
            }
            return false;
          },
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
        if (!editor.state?.selection || typeof editor.state.doc?.textBetween !== "function") return;
        const selectionFrom = editor.state.selection.from;
        setWikiLink((current) => {
          if (!current.open) return current;
          const query = editor.state.doc.textBetween(current.from + 2, selectionFrom, "\n", "\n");
          if (query.includes("]") || query.includes("\n")) return { open: false, from: 0, query: "" };
          return { ...current, query };
        });
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

  useEffect(() => {
    if (!editor) return;
    const eventedEditor = editor as Editor & { on?: Editor["on"]; off?: Editor["off"] };
    if (typeof eventedEditor.on !== "function" || typeof eventedEditor.off !== "function") return;
    const onTransaction = () => {
      const from = editor.state.selection.from;
      const start = Math.max(0, from - 80);
      const text = editor.state.doc.textBetween(start, from, "\n", "\n");
      const match = text.match(/\[\[([^\]\n]{0,80})$/);
      if (!match) return;
      setWikiLink({ open: true, from: from - match[0].length, query: match[1] ?? "" });
    };
    eventedEditor.on("transaction", onTransaction);
    return () => {
      eventedEditor.off?.("transaction", onTransaction);
    };
  }, [editor]);

  const matches = wikiLink.open ? filterLinkSuggestions(linkSuggestions, wikiLink.query).slice(0, 8) : [];
  const applyWikiLink = (suggestion: LinkSuggestion) => {
    if (!editor) return;
    const label = suggestion.path.split("/").pop()?.replace(/\.md$/i, "") ?? suggestion.path;
    editor
      .chain()
      .focus()
      .setTextSelection({ from: wikiLink.from, to: editor.state.selection.from })
      .insertContent(`<a href="${escapeAttribute(suggestion.href)}">${escapeHtml(label)}</a>`)
      .run();
    setWikiLink({ open: false, from: 0, query: "" });
  };

  return (
    <div className="visual-editor-shell">
      <EditorContent editor={editor} />
      {matches.length ? (
        <div className="wiki-link-popover" role="listbox" aria-label="Document link suggestions">
          {matches.map((suggestion) => (
            <button key={suggestion.path} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => applyWikiLink(suggestion)}>
              <span>{suggestion.path.split("/").pop()?.replace(/\.md$/i, "") ?? suggestion.path}</span>
              <small>{suggestion.path}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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

function filterLinkSuggestions(suggestions: LinkSuggestion[], query: string): LinkSuggestion[] {
  const value = query.trim().toLowerCase();
  if (!value) return suggestions;
  return suggestions.filter((suggestion) => suggestion.path.toLowerCase().includes(value));
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
