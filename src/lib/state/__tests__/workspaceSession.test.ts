import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearWorkspaceSession, loadWorkspaceSession, saveWorkspaceSession } from "../workspaceSession";

beforeEach(() => {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
  };
  Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, configurable: true });
  Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("workspaceSession", () => {
  it("persists only open path metadata for a bundle", () => {
    saveWorkspaceSession({
      rootPath: "/Users/example/Documents/Bundle",
      openPaths: ["a.md", "folder/b.md", "a.md"],
      activePath: "folder/b.md",
      updatedAt: "2026-06-16T21:00:00.000Z",
    });

    expect(loadWorkspaceSession("/Users/example/Documents/Bundle")).toEqual({
      rootPath: "/Users/example/Documents/Bundle",
      openPaths: ["a.md", "folder/b.md"],
      activePath: "folder/b.md",
      updatedAt: "2026-06-16T21:00:00.000Z",
    });
    expect(window.localStorage.getItem("onyxwriter.workspaceSessions")).not.toContain("contents");
  });

  it("falls back to the first open path when the active path is stale", () => {
    saveWorkspaceSession({
      rootPath: "/tmp/Bundle",
      openPaths: ["a.md", "b.md"],
      activePath: "missing.md",
      updatedAt: "2026-06-16T21:00:00.000Z",
    });

    expect(loadWorkspaceSession("/tmp/Bundle")?.activePath).toBe("a.md");
  });

  it("clears one bundle session without affecting another", () => {
    saveWorkspaceSession({ rootPath: "/tmp/A", openPaths: ["a.md"], activePath: "a.md", updatedAt: "now" });
    saveWorkspaceSession({ rootPath: "/tmp/B", openPaths: ["b.md"], activePath: "b.md", updatedAt: "now" });

    clearWorkspaceSession("/tmp/A");

    expect(loadWorkspaceSession("/tmp/A")).toBeNull();
    expect(loadWorkspaceSession("/tmp/B")?.openPaths).toEqual(["b.md"]);
  });
});
