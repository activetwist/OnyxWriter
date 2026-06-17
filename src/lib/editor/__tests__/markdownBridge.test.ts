import { describe, expect, it } from "vitest";
import { markdownToVisual, visualHtmlToMarkdown } from "../markdownBridge";

describe("markdown visual bridge", () => {
  it("round-trips supported headings, lists, links, and inline marks", () => {
    const markdown = "# Title\n\nA **bold** and *italic* [link](doc.md) with `code`.\n\n1. First\n2. Second\n";
    const visual = markdownToVisual(markdown);
    expect(visual.rawModeRecommended).toBe(false);
    expect(visualHtmlToMarkdown(visual.html)).toBe(markdown);
  });

  it("recommends raw mode for unsupported Markdown", () => {
    const visual = markdownToVisual("```js\nconsole.log(1)\n```\n");
    expect(visual.rawModeRecommended).toBe(true);
    expect(visual.capabilityReport.warnings.map((warning) => warning.code)).toContain("fenced-code");
  });

  it("round-trips simple Markdown tables", () => {
    const markdown = "| A | B |\n| --- | --- |\n| C | D |\n";
    const visual = markdownToVisual(markdown);
    expect(visual.rawModeRecommended).toBe(false);
    expect(visualHtmlToMarkdown(visual.html)).toBe(markdown);
  });

  it("round-trips Markdown images", () => {
    const markdown = "![Chart](assets/images/chart.png \"Quarterly chart\")\n";
    const visual = markdownToVisual(markdown);
    expect(visual.rawModeRecommended).toBe(false);
    expect(visualHtmlToMarkdown(visual.html)).toBe(markdown);
  });

  it("keeps Mermaid source out of the editable visual HTML", () => {
    const visual = markdownToVisual("Intro\n\n```mermaid\nflowchart LR\nA --> B\n```\n");
    expect(visual.rawModeRecommended).toBe(true);
    expect(visual.capabilityReport.warnings.map((warning) => warning.code)).toContain("mermaid");
    expect(visual.html).toContain("Intro");
    expect(visual.html).not.toContain("flowchart");
    expect(visual.html).not.toContain("```");
  });
});
