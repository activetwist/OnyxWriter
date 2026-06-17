import { hasMermaidBlocks, hasNonMermaidFence } from "./mermaidBlocks";

export type MarkdownCapabilityCode =
  | "fenced-code"
  | "mermaid"
  | "table"
  | "html"
  | "nested-list"
  | "blockquote"
  | "image"
  | "thematic-break"
  | "definition";

export interface MarkdownCapabilityWarning {
  code: MarkdownCapabilityCode;
  message: string;
}

export interface MarkdownCapabilityReport {
  safeForVisualEditing: boolean;
  warnings: MarkdownCapabilityWarning[];
}

export function analyzeMarkdownCapabilities(markdown: string): MarkdownCapabilityReport {
  const warnings: MarkdownCapabilityWarning[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  if (hasNonMermaidFence(markdown)) {
    warnings.push({ code: "fenced-code", message: "Fenced code blocks should be edited in raw mode." });
  }
  if (hasMermaidBlocks(markdown)) {
    warnings.push({ code: "mermaid", message: "Mermaid diagrams render in visual mode and should be edited in raw mode." });
  }
  if (hasUnsafeTable(lines)) {
    warnings.push({ code: "table", message: "Complex Markdown tables should be edited in raw mode." });
  }
  if (/<\/?[a-z][\s\S]*>/i.test(markdown)) {
    warnings.push({ code: "html", message: "Inline or block HTML should be edited in raw mode." });
  }
  if (lines.some((line) => /^ {2,}([-*+]|\d+\.)\s+/.test(line) || /^\t([-*+]|\d+\.)\s+/.test(line))) {
    warnings.push({ code: "nested-list", message: "Nested lists should be edited in raw mode until visual nesting is supported." });
  }
  if (lines.some((line) => /^>\s?/.test(line))) {
    warnings.push({ code: "blockquote", message: "Blockquotes should be edited in raw mode." });
  }
  if (lines.some((line) => /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line))) {
    warnings.push({ code: "thematic-break", message: "Thematic breaks should be edited in raw mode." });
  }
  if (lines.some((line) => /^\[[^\]]+]:\s+\S+/.test(line))) {
    warnings.push({ code: "definition", message: "Link definitions should be edited in raw mode." });
  }

  return {
    safeForVisualEditing: warnings.length === 0,
    warnings,
  };
}

function hasUnsafeTable(lines: string[]): boolean {
  for (let index = 0; index < lines.length; index += 1) {
    if (!isTableRow(lines[index])) continue;
    const header = splitTableRow(lines[index]);
    const separator = lines[index + 1] ? splitTableRow(lines[index + 1]) : [];
    if (!separator.length || separator.length !== header.length || !separator.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) {
      return true;
    }
    let rowIndex = index + 2;
    for (; rowIndex < lines.length && isTableRow(lines[rowIndex]); rowIndex += 1) {
      if (splitTableRow(lines[rowIndex]).length !== header.length) return true;
    }
    index = rowIndex - 1;
  }
  return false;
}

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  return trimmed.slice(1, trimmed.endsWith("|") ? -1 : undefined).split("|").map((cell) => cell.trim());
}
