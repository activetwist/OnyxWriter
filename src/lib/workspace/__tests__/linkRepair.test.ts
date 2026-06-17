import { describe, expect, it } from "vitest";
import { relativePathBetween, repairMovedLinksFrom, repairRelativeLinks } from "../linkRepair";

describe("link repair", () => {
  it("computes relative paths", () => {
    expect(relativePathBetween("datasets/sales.md", "tables/orders.md")).toBe("../tables/orders.md");
    expect(relativePathBetween("tables/orders.md", "tables/customers.md")).toBe("customers.md");
  });

  it("repairs links to a moved document", () => {
    const repaired = repairRelativeLinks("[Orders](orders.md)", "tables/customers.md", "tables/orders.md", "archive/orders.md");
    expect(repaired).toBe("[Orders](../archive/orders.md)");
  });

  it("repairs bundle-root links and preserves hashes", () => {
    const repaired = repairRelativeLinks("[Orders](/tables/orders.md#schema)", "notes/joins.md", "tables/orders.md", "archive/orders.md");
    expect(repaired).toBe("[Orders](/archive/orders.md#schema)");
  });

  it("repairs moved documents using old and new source locations", () => {
    const repaired = repairMovedLinksFrom("[Customers](customers.md)", "tables/orders.md", "archive/orders.md", [
      { from: "tables/customers.md", to: "archive/customers.md" },
    ]);
    expect(repaired).toBe("[Customers](customers.md)");
  });

  it("does not rewrite image links or fenced code examples", () => {
    const markdown = "![Orders](orders.md)\n\n```md\n[Orders](orders.md)\n```\n\n[Orders](orders.md)";
    const repaired = repairRelativeLinks(markdown, "tables/customers.md", "tables/orders.md", "archive/orders.md");
    expect(repaired).toBe("![Orders](orders.md)\n\n```md\n[Orders](orders.md)\n```\n\n[Orders](../archive/orders.md)");
  });
});
