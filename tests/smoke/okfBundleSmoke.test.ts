import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseOkfDocument, serializeOkfDocument, validateOkfText } from "../../src/lib/okf";
import { markdownPaths } from "../../src/lib/workspace/tree";
import type { WorkspaceEntry } from "../../src/lib/workspace/types";

const fixtureRoot: WorkspaceEntry = {
  name: "okf-basic",
  path: "",
  kind: "folder",
  reserved: false,
  children: [
    {
      name: "tables",
      path: "tables",
      kind: "folder",
      reserved: false,
      children: [
        { name: "orders.md", path: "tables/orders.md", kind: "file", reserved: false, children: [] },
        { name: "customers.md", path: "tables/customers.md", kind: "file", reserved: false, children: [] },
      ],
    },
    { name: "index.md", path: "index.md", kind: "file", reserved: true, children: [] },
  ],
};

describe("OKF sample bundle smoke test", () => {
  it("opens, validates, edits, and serializes a sample concept", () => {
    const paths = new Set(markdownPaths(fixtureRoot));
    const raw = readFileSync(join(process.cwd(), "tests/fixtures/okf-basic/tables/orders.md"), "utf8");
    const validation = validateOkfText("tables/orders.md", raw, paths);
    expect(validation.errors).toHaveLength(0);

    const doc = parseOkfDocument("tables/orders.md", raw);
    doc.frontmatter.title = "Orders Updated";
    doc.body += "\n# Examples\n\n- Count orders by day.\n";
    const serialized = serializeOkfDocument(doc);

    expect(serialized).toContain("title: Orders Updated");
    expect(validateOkfText("tables/orders.md", serialized, paths).errors).toHaveLength(0);
  });

  it("validates a nested OKF bundle inside a project fixture", () => {
    const projectTree: WorkspaceEntry = {
      name: "project",
      path: "",
      kind: "folder",
      reserved: false,
      children: [
        {
          name: ".git",
          path: ".git",
          kind: "folder",
          reserved: false,
          children: [{ name: "config.md", path: ".git/config.md", kind: "file", reserved: false, children: [] }],
        },
        {
          name: "docs",
          path: "docs",
          kind: "folder",
          reserved: false,
          children: [
            {
              name: "okf",
              path: "docs/okf",
              kind: "folder",
              reserved: false,
              children: [
                { name: "index.md", path: "docs/okf/index.md", kind: "file", reserved: true, children: [] },
                {
                  name: "systems",
                  path: "docs/okf/systems",
                  kind: "folder",
                  reserved: false,
                  children: [{ name: "api.md", path: "docs/okf/systems/api.md", kind: "file", reserved: false, children: [] }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(markdownPaths(projectTree)).not.toContain(".git/config.md");
    const bundlePaths = new Set(["index.md", "systems/api.md"]);
    const raw = readFileSync(join(process.cwd(), "tests/fixtures/project-bundle/docs/okf/systems/api.md"), "utf8");
    expect(validateOkfText("systems/api.md", raw, bundlePaths).errors).toHaveLength(0);
  });
});
