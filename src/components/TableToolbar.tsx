import type { Editor } from "@tiptap/react";
import { Columns3, Rows3, Table, Trash2 } from "lucide-react";

interface TableToolbarProps {
  editor: Editor | null;
  visible: boolean;
}

export function TableToolbar({ editor, visible }: TableToolbarProps) {
  if (!visible || !editor) return null;
  const chain = () => editor.chain().focus();
  return (
    <div className="table-toolbar" aria-label="Table tools">
      <ToolbarAction label="Add row" onClick={() => chain().addRowAfter().run()} icon={<Rows3 size={15} />} />
      <ToolbarAction label="Delete row" onClick={() => chain().deleteRow().run()} icon={<Rows3 size={15} />} />
      <ToolbarAction label="Add column" onClick={() => chain().addColumnAfter().run()} icon={<Columns3 size={15} />} />
      <ToolbarAction label="Delete column" onClick={() => chain().deleteColumn().run()} icon={<Columns3 size={15} />} />
      <ToolbarAction label="Header row" onClick={() => chain().toggleHeaderRow().run()} icon={<Table size={15} />} />
      <ToolbarAction label="Header column" onClick={() => chain().toggleHeaderColumn().run()} icon={<Table size={15} />} />
      <ToolbarAction label="Header cell" onClick={() => chain().toggleHeaderCell().run()} icon={<Table size={15} />} />
      <ToolbarAction label="Delete table" onClick={() => chain().deleteTable().run()} icon={<Trash2 size={15} />} />
    </div>
  );
}

function ToolbarAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button className="table-toolbar-button" type="button" onClick={onClick} title={label} aria-label={label}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
