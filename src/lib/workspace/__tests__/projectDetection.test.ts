import { describe, expect, it } from "vitest";
import {
  assessWorkspaceFolder,
  DEFAULT_PROJECT_BUNDLE_PATH,
  isIgnoredWorkspacePath,
  joinHostPath,
  validateProjectBundleSubpath,
  type WorkspaceFolderInspection,
} from "../projectDetection";

const inspection = (entries: string[], hasMarkdown = false): WorkspaceFolderInspection => ({
  path: "/tmp/project",
  name: "project",
  entries,
  projectMarkers: entries.filter((entry) => ["package.json", ".git", "Cargo.toml"].includes(entry)),
  okfMarkers: entries.filter((entry) => ["index.md", "log.md"].includes(entry)),
  hasMarkdown,
});

describe("project bundle detection", () => {
  it("detects likely code project roots", () => {
    expect(assessWorkspaceFolder(inspection([".git", "package.json"]))).toMatchObject({
      likelyProjectRoot: true,
      likelyOkfBundle: false,
      markers: [".git", "package.json"],
      suggestedBundlePath: DEFAULT_PROJECT_BUNDLE_PATH,
    });
  });

  it("recognizes likely OKF bundle roots", () => {
    expect(assessWorkspaceFolder(inspection(["index.md", "tables"], true))).toMatchObject({
      likelyProjectRoot: false,
      likelyOkfBundle: true,
    });
  });

  it("rejects unsafe nested bundle paths", () => {
    expect(validateProjectBundleSubpath("docs/okf")).toBe("docs/okf");
    expect(() => validateProjectBundleSubpath("../okf")).toThrow(/traversal/);
    expect(() => validateProjectBundleSubpath("/tmp/okf")).toThrow(/relative/);
    expect(() => validateProjectBundleSubpath(".git/okf")).toThrow(/source-control/);
  });

  it("joins nested bundle paths without allowing traversal", () => {
    expect(joinHostPath("/Users/example/project/", "docs/okf")).toBe("/Users/example/project/docs/okf");
    expect(() => joinHostPath("/Users/example/project", "../okf")).toThrow();
  });

  it("identifies ignored development folders anywhere in a path", () => {
    expect(isIgnoredWorkspacePath("node_modules/pkg/readme.md")).toBe(true);
    expect(isIgnoredWorkspacePath("docs/okf/system.md")).toBe(false);
  });
});
