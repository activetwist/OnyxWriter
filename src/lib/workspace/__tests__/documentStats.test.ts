import { describe, expect, it } from "vitest";
import { documentStatusStats, formatDocumentStatusStats, plainTextFromMarkdown } from "../documentStats";
import { buildDrawerGraph } from "../graph";
import type { WorkspaceEntry } from "../types";

const tree: WorkspaceEntry = {
  name: "Bundle",
  path: "",
  kind: "folder",
  reserved: false,
  children: [
    { name: "orders.md", path: "orders.md", kind: "file", reserved: false, children: [] },
    { name: "customers.md", path: "customers.md", kind: "file", reserved: false, children: [] },
    { name: "notes.md", path: "notes.md", kind: "file", reserved: false, children: [] },
  ],
};

describe("document status stats", () => {
  it("counts graph links and body-only document text", () => {
    const orders = "---\ntype: Concept\ntitle: Orders\n---\n\n# Orders\n\nHello [Customers](customers.md).";
    const graph = buildDrawerGraph(tree, {
      "orders.md": orders,
      "customers.md": "[Orders](orders.md)\n[Missing](missing.md)",
      "notes.md": "[Orders](orders.md)",
    });

    expect(documentStatusStats("orders.md", orders, graph)).toEqual({
      linksIn: 2,
      linksOut: 1,
      words: 3,
      characters: 24,
    });
  });

  it("falls back to raw text if OKF frontmatter cannot be parsed", () => {
    const graph = buildDrawerGraph(tree, { "orders.md": "" });

    expect(documentStatusStats("orders.md", "---\ntype: [\n---\n\nBroken body", graph)).toMatchObject({
      linksIn: 0,
      linksOut: 0,
      words: 3,
    });
  });

  it("returns null for non-markdown paths", () => {
    const graph = buildDrawerGraph(tree, {});

    expect(documentStatusStats("assets/logo.svg", "<svg />", graph)).toBeNull();
  });

  it("formats counts with stable separators", () => {
    expect(formatDocumentStatusStats({ linksIn: 5, linksOut: 3, words: 1437, characters: 9398 })).toBe(
      "Links In: 5 | Links Out: 3 | Words: 1,437 | Characters: 9,398",
    );
  });

  it("converts markdown syntax to visible text", () => {
    expect(plainTextFromMarkdown("## Title\n\n- **Bold** [label](https://example.com)\n\n![Alt text](image.png)")).toBe("Title\n\nBold label\n\nAlt text");
  });
});
