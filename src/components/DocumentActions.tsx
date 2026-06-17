import { FilePlus2, FolderPlus, Pencil, Trash2 } from "lucide-react";

interface DocumentActionsProps {
  disabled: boolean;
  canRename: boolean;
  canDelete: boolean;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function DocumentActions({ disabled, canRename, canDelete, onCreateFile, onCreateFolder, onRename, onDelete }: DocumentActionsProps) {
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
      <button type="button" disabled={disabled || !canDelete} onClick={onDelete} title="Delete selected item" aria-label="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  );
}
