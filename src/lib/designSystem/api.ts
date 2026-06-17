import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauriRuntime } from "../workspace/api";
import type { ImportedDesignSystemPayload } from "./types";

const IMPORTED_KEY = "onyxwriter.designSystems.imported";
const ACTIVE_KEY = "onyxwriter.designSystems.activeId";

interface StoredDesignSystem {
  id: string;
  contents: string;
}

export async function selectDesignSystemFile(): Promise<ImportedDesignSystemPayload | null> {
  if (isTauriRuntime()) {
    const selected = await open({
      directory: false,
      multiple: false,
      title: "Import JSONM Design System",
      filters: [{ name: "JSONM", extensions: ["jsonm", "json"] }],
    });
    if (typeof selected !== "string") return null;
    return {
      name: selected.split(/[\\/]/).pop() ?? "imported.jsonm",
      contents: await invoke<string>("read_design_system_import_file", { sourcePath: selected }),
    };
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".jsonm,.json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve({ name: file.name, contents: await file.text() });
    });
    input.click();
  });
}

export async function readImportedDesignSystems(): Promise<StoredDesignSystem[]> {
  if (isTauriRuntime()) return invoke<StoredDesignSystem[]>("list_imported_design_systems");
  return JSON.parse(window.localStorage.getItem(IMPORTED_KEY) ?? "[]") as StoredDesignSystem[];
}

export async function saveImportedDesignSystem(id: string, contents: string): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("save_imported_design_system", { id, contents });
    return;
  }
  const rows = (await readImportedDesignSystems()).filter((row) => row.id !== id);
  rows.push({ id, contents });
  window.localStorage.setItem(IMPORTED_KEY, JSON.stringify(rows));
}

export async function deleteImportedDesignSystem(id: string): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("delete_imported_design_system", { id });
    return;
  }
  const rows = (await readImportedDesignSystems()).filter((row) => row.id !== id);
  window.localStorage.setItem(IMPORTED_KEY, JSON.stringify(rows));
}

export async function readActiveDesignSystemId(): Promise<string> {
  if (isTauriRuntime()) {
    const settings = await invoke<{ active_id: string }>("read_design_system_settings");
    return settings.active_id || "";
  }
  return window.localStorage.getItem(ACTIVE_KEY) ?? "";
}

export async function writeActiveDesignSystemId(activeId: string): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("write_design_system_settings", { activeId });
    return;
  }
  window.localStorage.setItem(ACTIVE_KEY, activeId);
}

