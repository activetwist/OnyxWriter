import { describe, expect, it } from "vitest";
import { planDelete, planMove, planRename, remapSelectedPath } from "../mutations";
import type { WorkspaceEntry } from "../types";

const tree: WorkspaceEntry = {
  name: "drawer",
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
        { name: "index.md", path: "tables/index.md", kind: "file", reserved: true, children: [] },
      ],
    },
    { name: "archive", path: "archive", kind: "folder", reserved: false, children: [] },
    { name: "index.md", path: "index.md", kind: "file", reserved: true, children: [] },
  ],
};

describe("drawer mutation planning", () => {
  it("plans a rename with moved Markdown targets", () => {
    const plan = planRename(tree, "tables/orders.md", "sales-orders.md");
    expect(plan).toMatchObject({
      kind: "rename",
      sourcePath: "tables/orders.md",
      targetPath: "tables/sales-orders.md",
      destructive: false,
    });
    expect(plan.movedMarkdown).toEqual([{ from: "tables/orders.md", to: "tables/sales-orders.md" }]);
  });

  it("plans a folder move and excludes reserved files from link-target repairs", () => {
    const plan = planMove(tree, "tables", "archive");
    expect(plan.targetPath).toBe("archive/tables");
    expect(plan.affectedPaths).toEqual(expect.arrayContaining(["tables/orders.md", "tables/index.md"]));
    expect(plan.movedMarkdown).toEqual([{ from: "tables/orders.md", to: "archive/tables/orders.md" }]);
  });

  it("rejects reserved files and descendant moves", () => {
    expect(() => planDelete(tree, "index.md")).toThrow(/Reserved/);
    expect(() => planMove(tree, "tables", "tables")).toThrow(/itself/);
  });

  it("remaps selected paths after move and delete", () => {
    expect(remapSelectedPath("tables/orders.md", [{ from: "tables/orders.md", to: "archive/orders.md" }], [])).toBe("archive/orders.md");
    expect(remapSelectedPath("tables/orders.md", [], ["tables"])).toBe("");
  });
});
