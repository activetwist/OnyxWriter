import { describe, expect, it } from "vitest";
import { extractMermaidBlocks, hasNonMermaidFence, stripMermaidBlocks } from "../mermaidBlocks";

describe("mermaid block helpers", () => {
  it("extracts fenced Mermaid diagrams with source line metadata", () => {
    const blocks = extractMermaidBlocks("# Doc\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\nText");
    expect(blocks).toEqual([
      {
        id: "mermaid-1",
        source: "flowchart LR\n  A --> B",
        startLine: 3,
        endLine: 6,
      },
    ]);
  });

  it("strips Mermaid blocks from visual-editable Markdown", () => {
    expect(stripMermaidBlocks("Intro\n\n```mermaid\nflowchart TD\nA-->B\n```\n\nOutro")).toBe("Intro\n\nOutro");
  });

  it("does not classify Mermaid fences as generic unsupported fences", () => {
    expect(hasNonMermaidFence("```mermaid\nflowchart LR\nA-->B\n```")).toBe(false);
    expect(hasNonMermaidFence("```ts\nconst x = 1\n```")).toBe(true);
  });
});
