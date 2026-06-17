import { describe, expect, it } from "vitest";
import { analyzeMarkdownCapabilities } from "../markdownCapabilities";

describe("markdown capability policy", () => {
  it("allows simple OKF authoring Markdown", () => {
    const report = analyzeMarkdownCapabilities("# Heading\n\n1. One\n2. Two\n\nA [link](page.md).\n\n| A | B |\n| --- | --- |\n| C | D |\n\n![Chart](assets/images/chart.png)");
    expect(report.safeForVisualEditing).toBe(true);
    expect(report.warnings).toHaveLength(0);
  });

  it("flags constructs that require raw mode", () => {
    const report = analyzeMarkdownCapabilities("```ts\nconst x = 1\n```\n\n| A | B |\n| --- |\n\n- item\n  - nested");
    expect(report.safeForVisualEditing).toBe(false);
    expect(report.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["fenced-code", "table", "nested-list"]),
    );
  });

  it("treats Mermaid fences as visual preview diagrams edited in raw mode", () => {
    const report = analyzeMarkdownCapabilities("```mermaid\nflowchart LR\n  A --> B\n```");
    expect(report.safeForVisualEditing).toBe(false);
    expect(report.warnings.map((warning) => warning.code)).toContain("mermaid");
    expect(report.warnings.map((warning) => warning.code)).not.toContain("fenced-code");
  });
});
