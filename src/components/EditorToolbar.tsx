import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import {
  Bold,
  Code,
  Code2,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  Link2Off,
  List,
  ListOrdered,
  Network,
  Pilcrow,
  Redo2,
  RefreshCw,
  Save,
  Search,
  Strikethrough,
  Table2,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EditorCommandRequest } from "../lib/appCommands";
import type { EditorMode, SaveStatus } from "../lib/state/workspaceStore";
import { TableToolbar } from "./TableToolbar";

interface EditorToolbarProps {
  mode: EditorMode;
  dirty: boolean;
  saveStatus: SaveStatus;
  canSave: boolean;
  canRefresh: boolean;
  refreshBusy: boolean;
  visualEditor: Editor | null;
  canInsertImage: boolean;
  canOpenGraph: boolean;
  graphOpen: boolean;
  onModeChange: (mode: EditorMode) => void;
  onRefresh: () => void;
  onSave: () => void;
  onInsertImage: () => void;
  onToggleGraph: () => void;
  commandRequest?: EditorCommandRequest | null;
  linkSuggestions?: LinkSuggestion[];
  searchSource?: string;
}

export interface LinkSuggestion {
  href: string;
  path: string;
}

interface LinkEditorState {
  open: boolean;
  href: string;
  range: { from: number; to: number } | null;
}

export function EditorToolbar({
  mode,
  dirty,
  saveStatus,
  canSave,
  canRefresh,
  refreshBusy,
  visualEditor,
  canInsertImage,
  canOpenGraph,
  graphOpen,
  onModeChange,
  onRefresh,
  onSave,
  onInsertImage,
  onToggleGraph,
  commandRequest,
  linkSuggestions = [],
  searchSource = "",
}: EditorToolbarProps) {
  const [, setToolbarVersion] = useState(0);
  const [linkEditor, setLinkEditor] = useState<LinkEditorState>({ open: false, href: "", range: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!visualEditor) return;
    const refresh = () => setToolbarVersion((version) => version + 1);
    visualEditor.on("selectionUpdate", refresh);
    visualEditor.on("transaction", refresh);
    return () => {
      visualEditor.off("selectionUpdate", refresh);
      visualEditor.off("transaction", refresh);
    };
  }, [visualEditor]);

  useEffect(() => {
    if (!linkEditor.open) return;
    window.requestAnimationFrame(() => linkInputRef.current?.focus());
  }, [linkEditor.open]);

  useEffect(() => {
    if (!searchExpanded) return;
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [searchExpanded]);

  const canUseVisualCommands = mode === "visual" && Boolean(visualEditor) && visualEditor?.isEditable;
  const saveLabel = saveStatusLabel(saveStatus, dirty);
  const searchCount = searchQuery ? countMatches(searchSource, searchQuery) : 0;
  const searchActive = searchExpanded || Boolean(searchQuery);
  const runSearch = (direction: "forward" | "backward" = "forward") => {
    const query = searchQuery.trim();
    const nativeFind = (window as typeof window & { find?: (text: string, caseSensitive?: boolean, backwards?: boolean, wrap?: boolean, wholeWord?: boolean, searchInFrames?: boolean, showDialog?: boolean) => boolean }).find;
    if (!query || typeof nativeFind !== "function") return;
    nativeFind(query, false, direction === "backward", true, false, false, false);
  };
  const openLinkEditor = () => {
    if (!visualEditor) return;
    const previous = visualEditor.getAttributes("link").href as string | undefined;
    const { from, to } = visualEditor.state.selection;
    setLinkEditor({ open: true, href: previous ?? "", range: { from, to } });
  };
  const closeLinkEditor = () => setLinkEditor({ open: false, href: "", range: null });
  const updateLinkHref = (href: string) => setLinkEditor((current) => ({ ...current, href }));
  const applyLinkEditor = () => {
    if (!visualEditor) return;
    const href = linkEditor.href.trim();
    let command = visualEditor.chain().focus();
    if (linkEditor.range) command = command.setTextSelection(linkEditor.range);
    command = command.extendMarkRange("link");
    if (!href) {
      command.unsetLink().run();
      closeLinkEditor();
      return;
    }
    command.setLink({ href }).run();
    closeLinkEditor();
  };
  const removeLink = () => {
    if (!visualEditor) return;
    visualEditor.chain().focus().extendMarkRange("link").unsetLink().run();
    closeLinkEditor();
  };
  const executeEditorCommand = (command: EditorCommandRequest["command"]) => {
    if (!visualEditor || !canUseVisualCommands) return;
    const chain = visualEditor.chain().focus();
    switch (command) {
      case "editor.paragraph":
        chain.setParagraph().run();
        break;
      case "editor.heading1":
        chain.toggleHeading({ level: 1 }).run();
        break;
      case "editor.heading2":
        chain.toggleHeading({ level: 2 }).run();
        break;
      case "editor.heading3":
        chain.toggleHeading({ level: 3 }).run();
        break;
      case "editor.bold":
        chain.toggleBold().run();
        break;
      case "editor.italic":
        chain.toggleItalic().run();
        break;
      case "editor.strike":
        chain.toggleStrike().run();
        break;
      case "editor.code":
        chain.toggleCode().run();
        break;
      case "editor.bulletList":
        chain.toggleBulletList().run();
        break;
      case "editor.orderedList":
        chain.toggleOrderedList().run();
        break;
      case "editor.link":
        openLinkEditor();
        break;
      case "editor.unlink":
        removeLink();
        break;
      case "editor.table":
        chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case "editor.image":
        onInsertImage();
        break;
      case "editor.undo":
        chain.undo().run();
        break;
      case "editor.redo":
        chain.redo().run();
        break;
    }
  };

  useEffect(() => {
    if (!commandRequest) return;
    executeEditorCommand(commandRequest.command);
  }, [commandRequest]);

  return (
    <div className="editor-toolbar-stack">
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          {mode === "visual" ? (
            <div className="format-toolbar" aria-label="Visual formatting">
              <ToolbarButton
                label="Paragraph"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("paragraph"))}
                onClick={() => visualEditor?.chain().focus().setParagraph().run()}
                icon={<Pilcrow size={16} />}
              />
              <ToolbarButton
                label="Heading 1"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("heading", { level: 1 }))}
                onClick={() => visualEditor?.chain().focus().toggleHeading({ level: 1 }).run()}
                icon={<Heading1 size={16} />}
              />
              <ToolbarButton
                label="Heading 2"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("heading", { level: 2 }))}
                onClick={() => visualEditor?.chain().focus().toggleHeading({ level: 2 }).run()}
                icon={<Heading2 size={16} />}
              />
              <ToolbarButton
                label="Heading 3"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("heading", { level: 3 }))}
                onClick={() => visualEditor?.chain().focus().toggleHeading({ level: 3 }).run()}
                icon={<Heading3 size={16} />}
              />
              <ToolbarSeparator />
              <ToolbarButton
                label="Bold"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("bold"))}
                onClick={() => visualEditor?.chain().focus().toggleBold().run()}
                icon={<Bold size={16} />}
              />
              <ToolbarButton
                label="Italic"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("italic"))}
                onClick={() => visualEditor?.chain().focus().toggleItalic().run()}
                icon={<Italic size={16} />}
              />
              <ToolbarButton
                label="Strikethrough"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("strike"))}
                onClick={() => visualEditor?.chain().focus().toggleStrike().run()}
                icon={<Strikethrough size={16} />}
              />
              <ToolbarButton
                label="Inline code"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("code"))}
                onClick={() => visualEditor?.chain().focus().toggleCode().run()}
                icon={<Code size={16} />}
              />
              <ToolbarSeparator />
              <ToolbarButton
                label="Bullet list"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("bulletList"))}
                onClick={() => visualEditor?.chain().focus().toggleBulletList().run()}
                icon={<List size={16} />}
              />
              <ToolbarButton
                label="Ordered list"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("orderedList"))}
                onClick={() => visualEditor?.chain().focus().toggleOrderedList().run()}
                icon={<ListOrdered size={16} />}
              />
              <ToolbarSeparator />
              <ToolbarButton
                label="Add or edit link"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("link"))}
                onClick={openLinkEditor}
                icon={<Link size={16} />}
              />
              <ToolbarButton
                label="Remove link"
                disabled={!canUseVisualCommands || !visualEditor?.isActive("link")}
                onClick={removeLink}
                icon={<Link2Off size={16} />}
              />
              <ToolbarSeparator />
              <ToolbarButton
                label="Insert table"
                disabled={!canUseVisualCommands}
                active={Boolean(visualEditor?.isActive("table"))}
                onClick={() => visualEditor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                icon={<Table2 size={16} />}
              />
              <ToolbarButton
                label="Insert image"
                disabled={!canUseVisualCommands || !canInsertImage}
                onClick={onInsertImage}
                icon={<Image size={16} />}
              />
              <ToolbarSeparator />
              <ToolbarButton
                label="Undo"
                disabled={!canUseVisualCommands || !visualEditor?.can().undo()}
                onClick={() => visualEditor?.chain().focus().undo().run()}
                icon={<Undo2 size={16} />}
              />
              <ToolbarButton
                label="Redo"
                disabled={!canUseVisualCommands || !visualEditor?.can().redo()}
                onClick={() => visualEditor?.chain().focus().redo().run()}
                icon={<Redo2 size={16} />}
              />
            </div>
          ) : null}
        </div>
        <div className="editor-toolbar-utilities">
          <div
            className={`toolbar-search ${searchActive ? "expanded" : "collapsed"}`}
            role="search"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              runSearch(event.shiftKey ? "backward" : "forward");
            }}
            onBlur={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
              if (!searchQuery) setSearchExpanded(false);
            }}
          >
            <button
              className="toolbar-search-trigger"
              type="button"
              onClick={() => setSearchExpanded(true)}
              aria-label="Search current document"
              title="Search"
            >
              <Search size={14} aria-hidden="true" />
            </button>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              onFocus={() => setSearchExpanded(true)}
              placeholder="Search"
              aria-label="Search current document"
            />
            <span>{searchQuery ? searchCount : ""}</span>
            <button type="button" disabled={!searchQuery} onClick={() => runSearch("backward")} aria-label="Previous search result">
              Prev
            </button>
            <button type="button" disabled={!searchQuery} onClick={() => runSearch("forward")} aria-label="Next search result">
              Next
            </button>
          </div>
          <ToolbarSeparator />
          <div className="segmented-control" aria-label="Editor mode">
            <button className={mode === "visual" ? "active" : ""} onClick={() => onModeChange("visual")} title="Visual mode" aria-label="Visual mode" type="button">
              <Eye size={16} />
            </button>
            <button className={mode === "raw" ? "active" : ""} onClick={() => onModeChange("raw")} title="Raw mode" aria-label="Raw mode" type="button">
              <Code2 size={16} />
            </button>
          </div>
          <button
            className="toolbar-icon-button"
            disabled={!canRefresh || refreshBusy}
            onClick={onRefresh}
            title={refreshBusy ? "Refreshing bundle" : "Refresh bundle"}
            aria-label={refreshBusy ? "Refreshing bundle" : "Refresh bundle"}
            type="button"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className={`toolbar-icon-button save-action save-${saveStatus}`}
            disabled={!dirty || !canSave}
            onClick={onSave}
            title={saveLabel}
            aria-label={saveLabel}
            type="button"
          >
            <Save size={16} />
          </button>
          <button
            className={`toolbar-icon-button ${graphOpen ? "active" : ""}`}
            disabled={!canOpenGraph}
            onClick={onToggleGraph}
            title="Bundle graph"
            aria-label="Bundle graph"
            type="button"
          >
            <Network size={16} />
          </button>
        </div>
      </div>
      {linkEditor.open ? (
        <form
          className="link-editor-popover"
          onSubmit={(event) => {
            event.preventDefault();
            applyLinkEditor();
          }}
        >
          <label>
            <span>Link</span>
            <input
              ref={linkInputRef}
              value={linkEditor.href}
              placeholder="https://example.com or docs/page.md"
              list="onyx-link-suggestions"
              onChange={(event) => updateLinkHref(event.currentTarget.value)}
              onInput={(event) => updateLinkHref(event.currentTarget.value)}
            />
            {linkSuggestions.length ? (
              <datalist id="onyx-link-suggestions">
                {linkSuggestions.map((suggestion) => (
                  <option key={suggestion.path} value={suggestion.href} label={suggestion.path} />
                ))}
              </datalist>
            ) : null}
          </label>
          <div className="link-editor-actions">
            <button type="submit">Apply</button>
            <button type="button" onClick={removeLink} disabled={!visualEditor?.isActive("link") && !linkEditor.href.trim()}>
              Remove
            </button>
            <button type="button" onClick={closeLinkEditor}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      <TableToolbar editor={visualEditor} visible={mode === "visual" && Boolean(visualEditor?.isActive("table"))} />
    </div>
  );
}

function countMatches(source: string, query: string): number {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  const haystack = source.toLowerCase();
  while (offset < haystack.length) {
    const index = haystack.indexOf(needle, offset);
    if (index === -1) break;
    count += 1;
    offset = index + needle.length;
  }
  return count;
}

function saveStatusLabel(status: SaveStatus, dirty: boolean): string {
  if (status === "saving") return "Saving";
  if (status === "error") return "Error";
  if (dirty || status === "dirty") return "Unsaved";
  return "Saved";
}

function ToolbarButton({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`toolbar-icon-button ${active ? "active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function ToolbarSeparator() {
  return <span className="toolbar-separator" aria-hidden="true" />;
}
