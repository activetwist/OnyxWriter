import { ArrowDownAZ, ArrowUpAZ, ChevronsUpDown, FilePlus2, FolderPlus, Pencil, Trash2 } from "lucide-react";

interface DocumentActionsProps {
  disabled: boolean;
  canRename: boolean;
  canDelete: boolean;
  sortDirection: "asc" | "desc";
  allFoldersCollapsed: boolean;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onRename: () => void;
  onToggleSort: () => void;
  onToggleFoldAll: () => void;
  onDelete: () => void;
}

export function DocumentActions({
  disabled,
  canRename,
  canDelete,
  sortDirection,
  allFoldersCollapsed,
  onCreateFile,
  onCreateFolder,
  onRename,
  onToggleSort,
  onToggleFoldAll,
  onDelete,
}: DocumentActionsProps) {
  return (
    <div className="document-actions" aria-label="Document actions">
      <button type="button" disabled={disabled} onClick={onCreateFile} title="New document" aria-label="New document">
        <FilePlus2 size={16} />
      </button>
      <button type="button" disabled={disabled} onClick={onCreateFolder} title="New folder" aria-label="New folder">
        <FolderPlus size={16} />
      </button>
      <button type="button" disabled={disabled || !canRename} onClick={onRename} title="Rename selected item" aria-label="Rename">
        <Pencil size={16} />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleSort}
        title={sortDirection === "asc" ? "Sort descending" : "Sort ascending"}
        aria-label={sortDirection === "asc" ? "Sort descending" : "Sort ascending"}
      >
        {sortDirection === "asc" ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleFoldAll}
        title={allFoldersCollapsed ? "Expand folders" : "Collapse folders"}
        aria-label={allFoldersCollapsed ? "Expand folders" : "Collapse folders"}
      >
        <ChevronsUpDown size={16} />
      </button>
      <button type="button" disabled={disabled || !canDelete} onClick={onDelete} title="Delete selected item" aria-label="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  );
}
