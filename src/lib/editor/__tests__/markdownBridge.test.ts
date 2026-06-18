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

  it("does not duplicate TipTap-normalized tbody table headers", () => {
    const html = "<table><tbody><tr><th>Story</th><th>Publishes</th></tr><tr><td>P3-01</td><td>2026-06-18</td></tr></tbody></table>";
    expect(visualHtmlToMarkdown(html)).toBe("| Story | Publishes |\n| --- | --- |\n| P3-01 | 2026-06-18 |\n");
  });

  it("keeps table serialization idempotent after a TipTap-normalized table", () => {
    const html = "<table><tbody><tr><th>Story</th><th>Publishes</th></tr><tr><td>P3-01</td><td>2026-06-18</td></tr></tbody></table>";
    const first = visualHtmlToMarkdown(html);
    const second = visualHtmlToMarkdown(markdownToVisual(first).html);
    expect(second).toBe(first);
  });

  it("serializes header-only TipTap-normalized tables without adding body rows", () => {
    const html = "<table><tbody><tr><th>Story</th><th>Publishes</th></tr></tbody></table>";
    expect(visualHtmlToMarkdown(html)).toBe("| Story | Publishes |\n| --- | --- |\n");
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
