import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rememberDrawer, loadRecentDrawers } from "../../src/lib/workspace/recentWorkspaces";

describe("drawer startup smoke", () => {
  it("keeps recent drawer records as restore metadata only", () => {
    const data = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
        clear: () => data.clear(),
        key: (index: number) => Array.from(data.keys())[index] ?? null,
        get length() {
          return data.size;
        },
      } satisfies Storage,
    });

    rememberDrawer("/Users/example/OKF Drawer");
    expect(loadRecentDrawers()[0]).toMatchObject({ name: "OKF Drawer", path: "/Users/example/OKF Drawer" });
    expect(JSON.stringify(loadRecentDrawers())).not.toContain("---");
  });

  it("removes redundant left rail bundle prompt", () => {
    const sidebarSource = readFileSync("src/components/WorkspaceSidebar.tsx", "utf8");
    expect(sidebarSource).not.toContain("Open an Onyx drawer.");
    expect(sidebarSource).not.toContain("Open an Onyx bundle.");
  });

  it("keeps bundle commands in the left rail and out of the main launcher", () => {
    const sidebarSource = readFileSync("src/components/WorkspaceSidebar.tsx", "utf8");
    const launcherSource = readFileSync("src/components/WorkspaceLauncher.tsx", "utf8");
    expect(sidebarSource).toContain("<h1>Onyx Writer</h1>");
    expect(sidebarSource).toContain('aria-label="Open Bundle"');
    expect(sidebarSource).toContain('title="Open Bundle"');
    expect(sidebarSource).toContain('aria-label="Create Bundle"');
    expect(sidebarSource).toContain("drawer-command-row");
    expect(launcherSource).not.toContain("Open Bundle");
    expect(launcherSource).not.toContain("Create Bundle");
    expect(launcherSource).not.toContain("launcher-logo");
    expect(launcherSource).not.toContain("Onyx drawer");
    expect(launcherSource).toContain("No bundle open");
  });

  it("restores the left rail width while compacting toolbar utilities", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    const toolbarSource = readFileSync("src/components/EditorToolbar.tsx", "utf8");
    expect(styles).toContain("grid-template-columns: minmax(260px, 320px) minmax(0, 1fr)");
    expect(styles).toContain("flex-wrap: nowrap");
    expect(styles).toContain("overflow-x: auto");
    expect(toolbarSource).toContain('aria-label="Visual mode"');
    expect(toolbarSource).toContain('aria-label="Raw mode"');
    expect(toolbarSource).not.toContain("<span>Visual</span>");
    expect(toolbarSource).not.toContain("<span>Raw</span>");
    expect(toolbarSource).toContain("toolbar-icon-button save-action");
  });
});
