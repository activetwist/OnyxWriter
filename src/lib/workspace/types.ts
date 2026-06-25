export type WorkspaceEntryKind = "folder" | "file";
export type WorkspaceFileType = "markdown" | "image" | "other";

export interface WorkspaceEntry {
  name: string;
  path: string;
  kind: WorkspaceEntryKind;
  fileType?: WorkspaceFileType;
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
