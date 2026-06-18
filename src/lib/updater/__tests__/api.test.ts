import { afterEach, describe, expect, it, vi } from "vitest";
import { check } from "@tauri-apps/plugin-updater";
import { checkForOnyxUpdate, classifyUpdaterFailure } from "../api";

const isTauriRuntime = vi.fn(() => true);

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: vi.fn(),
}));

vi.mock("../../workspace/api", () => ({
  isTauriRuntime: () => isTauriRuntime(),
}));

afterEach(() => {
  vi.clearAllMocks();
  isTauriRuntime.mockReturnValue(true);
});

describe("updater api", () => {
  it("reports unsupported outside the desktop runtime", async () => {
    isTauriRuntime.mockReturnValue(false);

    await expect(checkForOnyxUpdate()).resolves.toEqual({
      status: "unsupported",
      reason: "Update checks are available in the desktop application.",
    });
    expect(check).not.toHaveBeenCalled();
  });

  it("reports current when the release channel has no update", async () => {
    vi.mocked(check).mockResolvedValue(null);

    await expect(checkForOnyxUpdate()).resolves.toEqual({ status: "current" });
  });

  it("maps an available update without exposing the Tauri resource", async () => {
    vi.mocked(check).mockResolvedValue({
      currentVersion: "0.1.0",
      version: "0.1.1",
      date: "2026-06-17T12:00:00Z",
      body: "Updater test release",
      downloadAndInstall: vi.fn(() => Promise.resolve()),
    } as never);

    const result = await checkForOnyxUpdate();

    expect(result.status).toBe("available");
    if (result.status !== "available") throw new Error("Expected update");
    expect(result.update).toEqual({
      currentVersion: "0.1.0",
      version: "0.1.1",
      date: "2026-06-17T12:00:00Z",
      body: "Updater test release",
    });
  });

  it("classifies signature, network, unsupported, and generic failures", () => {
    expect(classifyUpdaterFailure(new Error("signature verification failed")).kind).toBe("signature");
    expect(classifyUpdaterFailure(new Error("network timeout")).kind).toBe("network");
    expect(classifyUpdaterFailure(new Error("permission denied")).kind).toBe("unsupported");
    expect(classifyUpdaterFailure(new Error("unexpected")).kind).toBe("unknown");
  });
});
