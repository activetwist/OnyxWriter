import { describe, expect, it } from "vitest";
import { updateManagedIndexContent, generateIndexBlock } from "../../src/lib/workspace/indexManager";
import { repairMovedLinksFrom } from "../../src/lib/workspace/linkRepair";
import { planMove, planRename, remapSelectedPath } from "../../src/lib/workspace/mutations";
import type { WorkspaceEntry } from "../../src/lib/workspace/types";

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
        { name: "customers.md", path: "tables/customers.md", kind: "file", reserved: false, children: [] },
      ],
    },
    { name: "index.md", path: "index.md", kind: "file", reserved: true, children: [] },
  ],
};

describe("drawer mutation release smoke test", () => {
  it("plans moves with link repair scope and selected-path remapping", () => {
    const plan = planMove(tree, "tables/orders.md", "");
    expect(plan.targetPath).toBe("orders.md");
    expect(plan.movedMarkdown).toEqual([{ from: "tables/orders.md", to: "orders.md" }]);
    expect(remapSelectedPath("tables/orders.md", plan.movedMarkdown, [])).toBe("orders.md");

    const customers = "See [Orders](orders.md) and [Root Orders](/tables/orders.md).";
    const repaired = repairMovedLinksFrom(customers, "tables/customers.md", "tables/customers.md", plan.movedMarkdown);
    expect(repaired).toContain("[Orders](../orders.md)");
    expect(repaired).toContain("[Root Orders](/orders.md)");
  });

  it("keeps managed index content deterministic after a planned rename", () => {
    const plan = planRename(tree, "tables/customers.md", "accounts.md");
    expect(plan.movedMarkdown).toEqual([{ from: "tables/customers.md", to: "tables/accounts.md" }]);

    const index = updateManagedIndexContent("# Drawer\n\n<!-- onyxwriter:index:start -->\nold\n<!-- onyxwriter:index:end -->\n", generateIndexBlock(tree));
    expect(index).toContain("<!-- onyxwriter:index:start -->");
    expect(index).toContain("- [Orders](tables/orders.md)");
    expect(index).not.toContain("old");
  });
});
