import { parseOkfDocument } from "../okf";
import type { DrawerGraph } from "./graph";

export interface DocumentStatusStats {
  linksIn: number;
  linksOut: number;
  words: number;
  characters: number;
}

export function documentStatusStats(path: string | null | undefined, raw: string | null | undefined, graph: DrawerGraph): DocumentStatusStats | null {
  if (!path || !path.endsWith(".md")) return null;
  const graphNode = graph.nodes.find((node) => (node.kind === "document" || node.kind === "system") && node.path === path);
  const plainText = plainTextFromMarkdown(bodyForStats(path, raw ?? ""));

  return {
    linksIn: graphNode?.inbound ?? 0,
    linksOut: graphNode?.outbound ?? 0,
    words: wordCount(plainText),
    characters: characterCount(plainText),
  };
}

export function formatDocumentStatusStats(stats: DocumentStatusStats): string {
  return [
    `Links In: ${formatNumber(stats.linksIn)}`,
    `Links Out: ${formatNumber(stats.linksOut)}`,
    `Words: ${formatNumber(stats.words)}`,
    `Characters: ${formatNumber(stats.characters)}`,
  ].join(" | ");
}

export function plainTextFromMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/^```.*$/gm, "")
    .replace(/^~~~.*$/gm, "")
    .replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>\n]+>/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[ \t]{0,3}>\s?/gm, "")
    .replace(/^[ \t]*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/^[ \t]*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, "")
    .replace(/[|]/g, " ")
    .replace(/[*_~]{1,2}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function bodyForStats(path: string, raw: string): string {
  try {
    return parseOkfDocument(path, raw).body;
  } catch {
    return raw;
  }
}

function wordCount(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

function characterCount(text: string): number {
  return Array.from(text).length;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
