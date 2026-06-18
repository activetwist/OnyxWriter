import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { isTauriRuntime } from "../workspace/api";

export type UpdateProgress =
  | { phase: "starting"; totalBytes: number | null }
  | { phase: "downloading"; downloadedBytes: number; totalBytes: number | null }
  | { phase: "finished"; downloadedBytes: number; totalBytes: number | null };

export type UpdaterFailureKind = "network" | "signature" | "unsupported" | "unknown";

export interface OnyxUpdate {
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
}

export type UpdateCheckResult =
  | { status: "unsupported"; reason: string }
  | { status: "current" }
  | { status: "available"; update: OnyxUpdate; install: (onProgress?: (progress: UpdateProgress) => void) => Promise<void> };

export interface UpdaterFailure {
  kind: UpdaterFailureKind;
  message: string;
}

export async function checkForOnyxUpdate(): Promise<UpdateCheckResult> {
  if (!isTauriRuntime()) {
    return { status: "unsupported", reason: "Update checks are available in the desktop application." };
  }

  const update = await check();
  if (!update) return { status: "current" };

  return {
    status: "available",
    update: toOnyxUpdate(update),
    install: (onProgress) => downloadAndInstall(update, onProgress),
  };
}

export function classifyUpdaterFailure(error: unknown): UpdaterFailure {
  const message = error instanceof Error ? error.message : String(error || "Update failed.");
  const lower = message.toLowerCase();

  if (lower.includes("not allowed") || lower.includes("permission") || lower.includes("not available") || lower.includes("unsupported")) {
    return { kind: "unsupported", message };
  }

  if (lower.includes("signature") || lower.includes("sig") || lower.includes("minisign") || lower.includes("public key")) {
    return { kind: "signature", message };
  }

  if (lower.includes("network") || lower.includes("timed out") || lower.includes("timeout") || lower.includes("dns") || lower.includes("http")) {
    return { kind: "network", message };
  }

  return { kind: "unknown", message };
}

function toOnyxUpdate(update: Update): OnyxUpdate {
  return {
    currentVersion: update.currentVersion,
    version: update.version,
    date: update.date,
    body: update.body,
  };
}

async function downloadAndInstall(update: Update, onProgress?: (progress: UpdateProgress) => void): Promise<void> {
  let downloadedBytes = 0;
  let totalBytes: number | null = null;

  await update.downloadAndInstall((event: DownloadEvent) => {
    if (event.event === "Started") {
      downloadedBytes = 0;
      totalBytes = event.data.contentLength ?? null;
      onProgress?.({ phase: "starting", totalBytes });
      return;
    }

    if (event.event === "Progress") {
      downloadedBytes += event.data.chunkLength;
      onProgress?.({ phase: "downloading", downloadedBytes, totalBytes });
      return;
    }

    onProgress?.({ phase: "finished", downloadedBytes, totalBytes });
  });
}
