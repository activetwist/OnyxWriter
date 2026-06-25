import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import logoUrl from "../assets/brand/onyxwriter-logo.png";
import { flattenTree, isImageEntry, isMarkdownEntry, isReservedMarkdown } from "../lib/workspace/tree";
import type { RecentWorkspace } from "../lib/workspace/recentWorkspaces";
import type { WorkspaceEntry } from "../lib/workspace/types";
import { DocumentActions } from "./DocumentActions";

interface WorkspaceSidebarProps {
  rootPath: string;
  bundleName: string;
  tree: WorkspaceEntry | null;
  selectedPath: string;
  canMutateDocuments: boolean;
  collapsed: boolean;
  collapsedFolders: Set<string>;
  allFoldersCollapsed: boolean;
  recentWorkspaces: RecentWorkspace[];
  onOpenWorkspace: () => void;
  onCreateWorkspace: () => void;
  onOpenRecentWorkspace: (path: string) => void;
  onSelectPath: (path: string) => void;
  onSelectEntry: (path: string) => void;
  onToggleCollapsed: () => void;
  onToggleFolder: (path: string) => void;
  onToggleFoldAll: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMovePath: (sourcePath: string, destinationFolderPath: string) => void;
  onOpenSplitView: (path: string) => void;
  onOpenSettings: () => void;
  showSystemFiles: boolean;
}

export function WorkspaceSidebar({
  rootPath,
  bundleName,
  tree,
  selectedPath,
  canMutateDocuments,
  collapsed,
  collapsedFolders,
  allFoldersCollapsed,
  recentWorkspaces,
  onOpenWorkspace,
  onCreateWorkspace,
  onOpenRecentWorkspace,
  onSelectPath,
  onSelectEntry,
  onToggleCollapsed,
  onToggleFolder,
  onToggleFoldAll,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onMovePath,
  onOpenSplitView,
  onOpenSettings,
  showSystemFiles,
}: WorkspaceSidebarProps) {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [bundleMenuOpen, setBundleMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ path: string; x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<{
    sourcePath: string;
    startX: number;
    startY: number;
    active: boolean;
    dropPath: string;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const nodes = flattenTree(tree, 0, { includeSystemFiles: showSystemFiles, collapsedPaths: collapsedFolders, sortDirection }).filter((node) => node.path !== "");
  const contextEntry = contextMenu ? findEntry(tree, contextMenu.path) : null;
  const dragActive = Boolean(dragState?.active);
  const dropPath = dragState?.active ? dragState.dropPath : "";
  const activeDragSource = dragState?.sourcePath ?? "";
  const setDropTarget = (path: string) => {
    if (!dragState?.active) return;
    setDragState((current) => (current?.active ? { ...current, dropPath: path } : current));
  };
  const startPointerDrag = (event: ReactPointerEvent<HTMLElement>, path: string, draggable: boolean) => {
    if (!draggable || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({
      sourcePath: path,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      dropPath: "",
    });
  };

  useEffect(() => {
    if (!dragState) return;
    const onPointerMove = (event: PointerEvent) => {
      event.preventDefault();
      setDragState((current) => {
        if (!current) return current;
        const nextDropPath = dropPathFromPoint(event.clientX, event.clientY);
        if (current.active) return nextDropPath === null ? current : { ...current, dropPath: nextDropPath };
        const moved = Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY);
        return moved > 4 ? { ...current, active: true, dropPath: nextDropPath ?? "" } : current;
      });
    };
    const onPointerUp = (event: PointerEvent) => {
      event.preventDefault();
      setDragState((current) => {
        if (current?.active) {
          const releaseDropPath = dropPathFromPoint(event.clientX, event.clientY);
          const dropPath = releaseDropPath ?? current.dropPath;
          const targetPath = dropPath === "__root__" ? "" : dropPath;
          if (dropPath && !isInvalidDropTarget(current.sourcePath, targetPath)) {
            onMovePath(current.sourcePath, targetPath);
          }
          suppressClickRef.current = true;
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }
        return null;
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDragState(null);
    };
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dragState, onMovePath]);

  useEffect(() => {
    if (!contextMenu && !bundleMenuOpen) return;
    const close = () => {
      setContextMenu(null);
      setBundleMenuOpen(false);
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [bundleMenuOpen, contextMenu]);

  if (collapsed) {
    return (
      <aside className="workspace-sidebar collapsed" aria-label="Bundle explorer">
        <button className="sidebar-logo-button" type="button" onClick={onToggleCollapsed} aria-label="Expand explorer" title="Expand explorer">
          <img src={logoUrl} alt="" />
        </button>
        <div className="collapsed-sidebar-actions" aria-label="Bundle actions">
          <button className="icon-button" onClick={onOpenWorkspace} type="button" aria-label="Open Bundle" title="Open Bundle">
            <FolderOpen size={16} />
          </button>
          <button className="icon-button" onClick={onCreateWorkspace} type="button" aria-label="Create Bundle" title="Create Bundle">
            <Plus size={17} />
          </button>
          <button className="icon-button" onClick={onToggleCollapsed} type="button" aria-label="Expand explorer" title="Expand explorer">
            <PanelLeftOpen size={16} />
          </button>
        </div>
        <div className="sidebar-footer">
          <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="Open settings" title="Settings">
            <Settings size={17} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="workspace-sidebar" aria-label="Bundle explorer">
      <div className="sidebar-top">
        <div>
          <div className="brand-lockup">
            <img src={logoUrl} alt="" />
            <h1>Onyx Writer</h1>
          </div>
          <p>{rootPath ? "Bundle open" : "No bundle open"}</p>
        </div>
        <div className="drawer-command-row" aria-label="Bundle actions">
          <button className="icon-button" onClick={onOpenWorkspace} type="button" aria-label="Open Bundle" title="Open Bundle">
            <FolderOpen size={15} />
          </button>
          <button className="icon-button" onClick={onCreateWorkspace} type="button" aria-label="Create Bundle" title="Create Bundle">
            <Plus size={16} />
          </button>
          <button className="icon-button" onClick={onToggleCollapsed} type="button" aria-label="Collapse explorer" title="Collapse explorer">
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>
      <DocumentActions
        disabled={!canMutateDocuments}
        canRename={Boolean(canMutateDocuments && selectedPath)}
        canDelete={Boolean(canMutateDocuments && selectedPath)}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
        onRename={onRename}
        sortDirection={sortDirection}
        allFoldersCollapsed={allFoldersCollapsed}
        onToggleSort={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
        onToggleFoldAll={onToggleFoldAll}
        onDelete={onDelete}
      />
      <nav
        className={`tree ${dropPath === "__root__" ? "drop-target" : ""} ${dragActive ? "dragging" : ""}`}
        aria-label="Documents"
        data-drop-path="__root__"
        onPointerEnter={() => setDropTarget("__root__")}
      >
        {nodes.length === 0 ? null : (
          nodes.map((node) => {
            const selected = selectedPath === node.path;
            const reserved = node.kind === "file" && isReservedMarkdown(node.path);
            const draggable = !reserved;
            const folderCollapsed = node.kind === "folder" && collapsedFolders.has(node.path);
            const invalidDropTarget = activeDragSource ? isInvalidDropTarget(activeDragSource, node.path) : false;
            return (
              <div
                className={`tree-row ${selected ? "selected" : ""} ${reserved ? "reserved" : ""} ${
                  dropPath === node.path && !invalidDropTarget ? "drop-target" : ""
                } ${dropPath === node.path && invalidDropTarget ? "invalid-drop-target" : ""}`}
                key={node.path || node.name}
                data-tree-path={node.path}
                data-drop-path={node.kind === "folder" ? node.path : undefined}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onSelectEntry(node.path);
                  if (isMarkdownEntry(node) || isImageEntry(node)) onSelectPath(node.path);
                  setContextMenu({ path: node.path, x: event.clientX, y: event.clientY });
                }}
                onPointerEnter={(event) => {
                  if (!dragState?.active || node.kind !== "folder") return;
                  event.stopPropagation();
                  setDropTarget(node.path);
                }}
                style={{ paddingLeft: `${12 + node.depth * 14}px` }}
              >
                {node.kind === "folder" ? (
                  <button
                    className="tree-disclosure"
                    type="button"
                    aria-label={folderCollapsed ? `Expand ${node.name}` : `Collapse ${node.name}`}
                    onClick={() => onToggleFolder(node.path)}
                  >
                    {folderCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>
                ) : (
                  <span className="tree-disclosure-spacer" aria-hidden="true" />
                )}
                <div
                  className="tree-row-main"
                  draggable={false}
                  data-draggable={draggable ? "true" : "false"}
                  onPointerDown={(event) => startPointerDrag(event, node.path, draggable)}
                  onClick={(event) => {
                    if (suppressClickRef.current) {
                      event.preventDefault();
                      return;
                    }
                    onSelectEntry(node.path);
                    if (node.kind === "file" && (isMarkdownEntry(node) || isImageEntry(node))) onSelectPath(node.path);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onSelectEntry(node.path);
                    if (node.kind === "file" && (isMarkdownEntry(node) || isImageEntry(node))) onSelectPath(node.path);
                  }}
                  role="button"
                  tabIndex={0}
                  title={node.path}
                >
                  {node.kind === "folder" ? folderCollapsed ? <Folder size={16} /> : <FolderOpen size={16} /> : isImageEntry(node) ? <FileImage size={16} /> : <FileText size={16} />}
                  <span>{node.name}</span>
                </div>
              </div>
            );
          })
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="bundle-switcher">
          <button
            className="bundle-switcher-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setBundleMenuOpen((current) => !current);
            }}
            aria-label="Switch bundle"
            aria-expanded={bundleMenuOpen}
          >
            <ChevronsUpDown size={16} />
            <span>{rootPath ? bundleName : "No bundle open"}</span>
          </button>
          {bundleMenuOpen ? (
            <div className="bundle-switcher-menu" role="menu">
              {recentWorkspaces.length ? (
                recentWorkspaces.map((workspace) => (
                  <button
                    key={workspace.path}
                    type="button"
                    role="menuitem"
                    onClick={(event) => {
                      event.stopPropagation();
                      setBundleMenuOpen(false);
                      onOpenRecentWorkspace(workspace.path);
                    }}
                  >
                    <span>{workspace.name}</span>
                    <small>{workspace.path}</small>
                  </button>
                ))
              ) : (
                <span className="bundle-switcher-empty">No recent bundles</span>
              )}
            </div>
          ) : null}
        </div>
        <button className="settings-button" type="button" onClick={onOpenSettings} aria-label="Open settings">
          <Settings size={17} />
          <span>Settings</span>
        </button>
      </div>
      {contextMenu && contextEntry ? (
        <div className="tree-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} role="menu" onClick={(event) => event.stopPropagation()}>
          {contextEntry.kind === "file" && isMarkdownEntry(contextEntry) && !isReservedMarkdown(contextEntry.path) ? (
            <button type="button" role="menuitem" onClick={() => { setContextMenu(null); onOpenSplitView(contextEntry.path); }}>
              Open in Split View
            </button>
          ) : null}
          <button type="button" role="menuitem" onClick={() => { setContextMenu(null); onCreateFile(); }}>
            New Document
          </button>
          <button type="button" role="menuitem" onClick={() => { setContextMenu(null); onCreateFolder(); }}>
            New Folder
          </button>
          <button type="button" role="menuitem" disabled={!canMutateDocuments || !contextEntry.path || (contextEntry.kind === "file" && isReservedMarkdown(contextEntry.path))} onClick={() => { setContextMenu(null); onRename(); }}>
            Rename
          </button>
          <button type="button" role="menuitem" disabled={!canMutateDocuments || !contextEntry.path || (contextEntry.kind === "file" && isReservedMarkdown(contextEntry.path))} onClick={() => { setContextMenu(null); onDelete(); }}>
            Delete
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function findEntry(entry: WorkspaceEntry | null, path: string): WorkspaceEntry | null {
  if (!entry) return null;
  if (entry.path === path) return entry;
  for (const child of entry.children) {
    const found = findEntry(child, path);
    if (found) return found;
  }
  return null;
}

function isInvalidDropTarget(sourcePath: string, targetPath: string): boolean {
  if (!sourcePath) return true;
  if (!targetPath) return false;
  return targetPath === sourcePath || targetPath.startsWith(`${sourcePath}/`);
}

function dropPathFromPoint(clientX: number, clientY: number): string | null {
  const folderPath = dropPathFromGeometry(clientX, clientY, ".tree-row[data-drop-path]");
  if (folderPath !== null) return folderPath;
  const rootPath = dropPathFromGeometry(clientX, clientY, ".tree[data-drop-path]");
  if (rootPath !== null) return rootPath;

  if (typeof document.elementFromPoint !== "function") return null;
  const target = document.elementFromPoint(clientX, clientY);
  if (!(target instanceof Element)) return null;
  const row = target.closest<HTMLElement>("[data-tree-path]");
  if (row) return row.dataset.dropPath ?? null;
  const dropTarget = target.closest<HTMLElement>("[data-drop-path]");
  return dropTarget?.dataset.dropPath ?? null;
}

function dropPathFromGeometry(clientX: number, clientY: number, selector: string): string | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const target of targets) {
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const insideX = clientX >= rect.left && clientX <= rect.right;
    const insideY = clientY >= rect.top && clientY <= rect.bottom;
    if (insideX && insideY) return target.dataset.dropPath ?? null;
  }
  return null;
}
