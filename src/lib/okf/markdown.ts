import { analyzeMarkdownCapabilities } from "../editor/markdownCapabilities";

export function topLevelHeadings(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => /^# [^#]/.test(line))
    .map((line) => line.replace(/^# /, "").trim());
}

export function hasLikelyUnsupportedVisualMarkdown(markdown: string): boolean {
  return !analyzeMarkdownCapabilities(markdown).safeForVisualEditing;
}

export function markdownTitleFallback(path: string): string {
  const basename = path.split("/").pop()?.replace(/\.md$/, "") ?? path;
  return basename
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
