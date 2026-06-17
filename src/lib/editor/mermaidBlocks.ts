export interface MermaidBlock {
  id: string;
  source: string;
  startLine: number;
  endLine: number;
}

const FENCE_START_RE = /^(```|~~~)\s*mermaid\s*$/i;
const FENCE_ANY_RE = /^(```|~~~)/;

export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MermaidBlock[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!FENCE_START_RE.test(lines[index])) continue;
    const fence = lines[index].trim().slice(0, 3);
    const sourceLines: string[] = [];
    const startLine = index + 1;
    index += 1;
    for (; index < lines.length; index += 1) {
      if (lines[index].trim() === fence) break;
      sourceLines.push(lines[index]);
    }
    blocks.push({
      id: `mermaid-${blocks.length + 1}`,
      source: sourceLines.join("\n").trim(),
      startLine,
      endLine: Math.min(index + 1, lines.length),
    });
  }
  return blocks;
}

export function hasMermaidBlocks(markdown: string): boolean {
  return extractMermaidBlocks(markdown).length > 0;
}

export function stripMermaidBlocks(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!FENCE_START_RE.test(lines[index])) {
      output.push(lines[index]);
      continue;
    }
    const fence = lines[index].trim().slice(0, 3);
    for (index += 1; index < lines.length; index += 1) {
      if (lines[index].trim() === fence) break;
    }
  }
  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function hasNonMermaidFence(markdown: string): boolean {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (!FENCE_ANY_RE.test(lines[index])) continue;
    if (!FENCE_START_RE.test(lines[index])) return true;
    const fence = lines[index].trim().slice(0, 3);
    for (index += 1; index < lines.length; index += 1) {
      if (lines[index].trim() === fence) break;
    }
  }
  return false;
}
