import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";

export const tiptapExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    protocols: ["http", "https", "mailto"],
  }),
  Table.configure({
    resizable: false,
  }),
  TableRow,
  TableHeader,
  TableCell,
  Image.configure({
    allowBase64: false,
  }),
];
