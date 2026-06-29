import { invoke } from "@tauri-apps/api/core";
import { open, save as saveDialog } from "@tauri-apps/plugin-dialog";
import type { WorkspaceFolderInspection } from "./projectDetection";
import type { WorkspaceEntry } from "./types";

export interface SelectedImageAsset {
  relativePath: string;
}

export interface WorkspaceAsset {
  mimeType: string;
  data: number[];
}

export interface EncryptedWorkspaceInfo {
  ok: boolean;
  rootPath: string;
  generation: number;
  bundleName: string;
  documents: string[];
}

export interface EncryptedDocumentRead {
  path: string;
  contents: string;
  generation: number;
  version: number;
}

export interface EncryptedDocumentWrite {
  ok: boolean;
  path: string;
  generation: number;
  version: number;
}

export async function selectWorkspaceDirectory(title = "Open Onyx Workspace"): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const selected = await open({ directory: true, multiple: false, title });
  return typeof selected === "string" ? selected : null;
}

export async function listWorkspace(root: string): Promise<WorkspaceEntry> {
  return invoke<WorkspaceEntry>("list_workspace", { root });
}

export async function directoryHasEntries(root: string): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  return invoke<boolean>("directory_has_entries", { root });
}

export async function inspectWorkspaceFolder(root: string): Promise<WorkspaceFolderInspection | null> {
  if (!isTauriRuntime()) return null;
  const inspection = await invoke<{
    path: string;
    name: string;
    entries: string[];
    project_markers: string[];
    okf_markers: string[];
    has_markdown: boolean;
  }>("inspect_workspace_folder", { root });
  return {
    path: inspection.path,
    name: inspection.name,
    entries: inspection.entries,
    projectMarkers: inspection.project_markers,
    okfMarkers: inspection.okf_markers,
    hasMarkdown: inspection.has_markdown,
  };
}

export async function readWorkspaceFile(root: string, relativePath: string): Promise<string> {
  return invoke<string>("read_text_file", { root, relativePath });
}

export async function readWorkspaceAsset(root: string, relativePath: string): Promise<WorkspaceAsset> {
  return invoke<WorkspaceAsset>("read_workspace_asset", { root, relativePath });
}

export async function writeWorkspaceFile(root: string, relativePath: string, contents: string): Promise<void> {
  await invoke("write_text_file", { root, relativePath, contents });
}

export async function selectExportFile(defaultPath: string): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const selected = await saveDialog({
    title: "Export Document",
    defaultPath,
    filters: [
      { name: "Markdown", extensions: ["md"] },
      { name: "Plain Text", extensions: ["txt"] },
      { name: "Rich Text", extensions: ["rtf"] },
    ],
  });
  return typeof selected === "string" ? selected : null;
}

export async function writeExportFile(destinationPath: string, contents: string): Promise<void> {
  await invoke("write_export_file", { destinationPath, contents });
}

export async function revealWorkspacePath(root: string, relativePath: string): Promise<void> {
  await invoke("reveal_path", { root, relativePath });
}

export async function createWorkspaceFolder(root: string, relativePath: string): Promise<void> {
  await invoke("create_folder", { root, relativePath });
}

export async function createWorkspaceMarkdownFile(root: string, relativePath: string, contents: string): Promise<void> {
  await invoke("create_markdown_file", { root, relativePath, contents });
}

export async function initializeWorkspace(root: string, title: string): Promise<void> {
  await invoke("initialize_workspace", { root, title });
}

export async function selectAndImportDrawerImage(root: string): Promise<SelectedImageAsset | null> {
  if (!isTauriRuntime()) return null;
  const selected = await open({
    directory: false,
    multiple: false,
    title: "Insert Image",
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
  });
  if (typeof selected !== "string") return null;
  const relativePath = await invoke<string>("import_image_asset", { root, sourcePath: selected });
  return { relativePath };
}

export async function renameWorkspacePath(root: string, relativePath: string, newName: string): Promise<string> {
  return invoke<string>("rename_path", { root, relativePath, newName });
}

export async function moveWorkspacePath(root: string, relativePath: string, destinationPath: string): Promise<void> {
  await invoke("move_path", { root, relativePath, destinationPath });
}

export async function deleteWorkspacePath(root: string, relativePath: string): Promise<void> {
  await invoke("delete_path", { root, relativePath });
}

export async function initializeEncryptedWorkspace(root: string, passphrase: string, name: string): Promise<EncryptedWorkspaceInfo> {
  return invoke<EncryptedWorkspaceInfo>("initialize_encrypted_folder", { root, passphrase, name });
}

export async function openEncryptedWorkspace(root: string, passphrase: string): Promise<EncryptedWorkspaceInfo> {
  return invoke<EncryptedWorkspaceInfo>("encrypted_folder_info", { root, passphrase });
}

export async function listEncryptedWorkspace(root: string, passphrase: string): Promise<EncryptedWorkspaceInfo> {
  return invoke<EncryptedWorkspaceInfo>("list_encrypted_folder", { root, passphrase });
}

export async function readEncryptedWorkspaceFile(root: string, passphrase: string, relativePath: string): Promise<EncryptedDocumentRead> {
  return invoke<EncryptedDocumentRead>("read_encrypted_document", { root, passphrase, relativePath });
}

export async function writeEncryptedWorkspaceFile(
  root: string,
  passphrase: string,
  relativePath: string,
  contents: string,
  expectedGeneration?: number,
): Promise<EncryptedDocumentWrite> {
  return invoke<EncryptedDocumentWrite>("write_encrypted_document", {
    root,
    passphrase,
    relativePath,
    contents,
    expectedGeneration,
  });
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
