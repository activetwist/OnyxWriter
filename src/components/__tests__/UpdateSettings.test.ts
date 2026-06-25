import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateSettings } from "../UpdateSettings";
import { checkForOnyxUpdate } from "../../lib/updater/api";

vi.mock("../../lib/updater/api", () => ({
  checkForOnyxUpdate: vi.fn(),
  classifyUpdaterFailure: vi.fn((error: unknown) => ({
    kind: "network",
    message: error instanceof Error ? error.message : String(error),
  })),
}));

beforeEach(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("UpdateSettings", () => {
  it("shows the installed version before checking for updates", async () => {
    const host = await renderUpdateSettings();

    expect(host.textContent).toContain("Installed version: 0.1.7");
  });

  it("shows a no-update status after checking", async () => {
    vi.mocked(checkForOnyxUpdate).mockResolvedValue({ status: "current" });
    const host = await renderUpdateSettings();

    await click(host.querySelector("button") as HTMLButtonElement);

    expect(host.textContent).toContain("Onyx Writer is up to date.");
  });

  it("shows an available update and installs it when requested", async () => {
    const install = vi.fn(() => Promise.resolve());
    vi.mocked(checkForOnyxUpdate).mockResolvedValue({
      status: "available",
      update: { currentVersion: "0.1.0", version: "0.1.1", body: "Test release" },
      install,
    });
    const host = await renderUpdateSettings();

    await click(host.querySelector("button") as HTMLButtonElement);
    expect(host.textContent).toContain("Onyx Writer 0.1.1 is available.");

    const installButton = Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Install Update"));
    await click(installButton as HTMLButtonElement);

    expect(install).toHaveBeenCalled();
    expect(host.textContent).toContain("Update installed. Restart Onyx Writer to use the new version.");
  });

  it("shows unsupported runtime status", async () => {
    vi.mocked(checkForOnyxUpdate).mockResolvedValue({ status: "unsupported", reason: "Desktop only." });
    const host = await renderUpdateSettings();

    await click(host.querySelector("button") as HTMLButtonElement);

    expect(host.textContent).toContain("Desktop only.");
  });

  it("shows update failures without crashing", async () => {
    vi.mocked(checkForOnyxUpdate).mockRejectedValue(new Error("network timeout"));
    const host = await renderUpdateSettings();

    await click(host.querySelector("button") as HTMLButtonElement);

    expect(host.textContent).toContain("Update check failed because the release channel could not be reached");
  });
});

async function renderUpdateSettings(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(UpdateSettings));
  });
  return host;
}

async function click(button: HTMLButtonElement): Promise<void> {
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
