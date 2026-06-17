import { afterEach, describe, expect, it, vi } from "vitest";
import { openUrl } from "@tauri-apps/plugin-opener";
import { openExternalHref } from "../AppShell";

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(() => Promise.resolve()),
}));

afterEach(() => {
  delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("AppShell link opening", () => {
  it("delegates safe external links to the Tauri system opener", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });

    await expect(openExternalHref("https://google.com")).resolves.toBe(true);

    expect(openUrl).toHaveBeenCalledWith("https://google.com/");
  });

  it("normalizes mixed-case external schemes before using the Tauri system opener", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });

    await expect(openExternalHref("Https://google.com")).resolves.toBe(true);

    expect(openUrl).toHaveBeenCalledWith("https://google.com/");
  });

  it("falls back to window.open outside Tauri", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    await expect(openExternalHref("mailto:team@example.com")).resolves.toBe(true);

    expect(open).toHaveBeenCalledWith("mailto:team@example.com", "_blank", "noopener,noreferrer");
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("does not open unsupported external protocols", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    await expect(openExternalHref("file:///tmp/private.md")).resolves.toBe(false);

    expect(open).not.toHaveBeenCalled();
    expect(openUrl).not.toHaveBeenCalled();
  });
});
