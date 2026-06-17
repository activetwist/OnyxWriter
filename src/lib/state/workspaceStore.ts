import type { ValidationResult } from "../okf";
import type { WorkspaceEntry } from "../workspace/types";

export type EditorMode = "visual" | "raw";
export type SaveStatus = "clean" | "dirty" | "saving" | "saved" | "error";

export const AUTOSAVE_DEBOUNCE_MS = 1000;

export interface OpenDocumentState {
  path: string;
  raw: string;
  dirty: boolean;
  validation: ValidationResult;
}

export interface AppWorkspaceState {
  rootPath: string;
  tree: WorkspaceEntry | null;
  selectedPath: string;
  selectedTreePath: string;
  openDocument: OpenDocumentState | null;
  openDocuments: OpenDocumentState[];
  mode: EditorMode;
  saveStatus: SaveStatus;
  status: string;
}

export const initialWorkspaceState: AppWorkspaceState = {
  rootPath: "",
  tree: null,
  selectedPath: "",
  selectedTreePath: "",
  openDocument: null,
  openDocuments: [],
  mode: "visual",
  saveStatus: "clean",
  status: "",
};

export function canAutosaveDocument(rootPath: string, document: OpenDocumentState | null): boolean {
  return Boolean(rootPath && rootPath !== "Sample bundle" && rootPath !== "Sample drawer" && document?.dirty);
}

export function upsertOpenDocument(documents: OpenDocumentState[], document: OpenDocumentState): OpenDocumentState[] {
  const index = documents.findIndex((item) => item.path === document.path);
  if (index === -1) return [...documents, document];
  return documents.map((item, itemIndex) => (itemIndex === index ? document : item));
}

export function removeOpenDocument(documents: OpenDocumentState[], path: string): OpenDocumentState[] {
  return documents.filter((document) => document.path !== path);
}
