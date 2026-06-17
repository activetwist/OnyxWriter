import { beforeEach, describe, expect, it } from "vitest";
import { forgetRecentDrawer, forgetRecentWorkspace, loadRecentDrawers, loadRecentWorkspaces, rememberDrawer, rememberWorkspace } from "../recentWorkspaces";

describe("recent drawers", () => {
  beforeEach(() => {
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
  });

  it("stores recent drawer metadata without document content", () => {
    const recent = rememberDrawer("/Users/example/Knowledge");
    expect(recent[0]).toMatchObject({ path: "/Users/example/Knowledge", name: "Knowledge" });
    expect(JSON.stringify(recent)).not.toContain("frontmatter");
    expect(loadRecentDrawers()).toHaveLength(1);
  });

  it("deduplicates and forgets paths", () => {
    rememberDrawer("/tmp/a");
    rememberDrawer("/tmp/a");
    expect(loadRecentDrawers()).toHaveLength(1);
    forgetRecentDrawer("/tmp/a");
    expect(loadRecentDrawers()).toHaveLength(0);
  });

  it("keeps workspace aliases for existing call sites", () => {
    rememberWorkspace("/tmp/legacy");
    expect(loadRecentWorkspaces()).toHaveLength(1);
    forgetRecentWorkspace("/tmp/legacy");
    expect(loadRecentWorkspaces()).toHaveLength(0);
  });
});
