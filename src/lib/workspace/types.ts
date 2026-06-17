export type WorkspaceEntryKind = "folder" | "file";

export interface WorkspaceEntry {
  name: string;
  path: string;
  kind: WorkspaceEntryKind;
  reserved: boolean;
  children: WorkspaceEntry[];
}

export interface WorkspaceState {
  rootPath: string;
  tree: WorkspaceEntry | null;
}

export interface TreeNode extends WorkspaceEntry {
  depth: number;
}
