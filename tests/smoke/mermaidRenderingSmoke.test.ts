import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeMarkdownCapabilities } from "../../src/lib/editor/markdownCapabilities";
import { extractMermaidBlocks } from "../../src/lib/editor/mermaidBlocks";
import { markdownToVisual } from "../../src/lib/editor/markdownBridge";

describe("Mermaid rendering smoke", () => {
  it("detects Mermaid fixture diagrams as visual previews edited in raw mode", () => {
    const raw = readFileSync(join(process.cwd(), "tests/fixtures/okf-basic/visualizations.md"), "utf8");
    const blocks = extractMermaidBlocks(raw);
    const visual = markdownToVisual(raw);
    const capabilityReport = analyzeMarkdownCapabilities(raw);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toContain("flowchart LR");
    expect(capabilityReport.warnings.map((warning) => warning.code)).toContain("mermaid");
    expect(capabilityReport.warnings.map((warning) => warning.code)).not.toContain("fenced-code");
    expect(visual.html).not.toContain("flowchart LR");
  });
});
