import { classifyLink, resolveInternalLink } from "../okf/links";
import type { PathMove } from "./mutations";

const IMAGE_LINK_RE = /!\[[^\]]*]\([^)]+\)/g;
const FENCED_BLOCK_RE = /(```|~~~)[\s\S]*?\1/g;
const LINK_RE = /(?<!!)\[([^\]]+)\]\(([^)\s]+)([^)]*)\)/g;

export function repairRelativeLinks(markdown: string, fromPath: string, movedFrom: string, movedTo: string): string {
  return repairMovedLinks(markdown, fromPath, [{ from: movedFrom, to: movedTo }]);
}

export function repairMovedLinks(markdown: string, fromPath: string, movedPaths: PathMove[]): string {
  return repairMovedLinksFrom(markdown, fromPath, fromPath, movedPaths);
}

export function repairMovedLinksFrom(markdown: string, oldFromPath: string, newFromPath: string, movedPaths: PathMove[]): string {
  const protectedRanges = protectedMarkdownRanges(markdown);
  return markdown.replace(LINK_RE, (full: string, label: string, href: string, suffix: string, offset: number) => {
    if (protectedRanges.some(([start, end]) => offset >= start && offset < end)) return full;
    const kind = classifyLink(href);
    if (kind !== "relative" && kind !== "bundle-absolute") return full;
    const resolved = resolveInternalLink(href, oldFromPath)?.split("#")[0];
    const move = movedPaths.find((candidate) => resolved === candidate.from);
    if (!move) return full;
    const hash = href.includes("#") ? `#${href.split("#").slice(1).join("#")}` : "";
    const nextHref = kind === "bundle-absolute" ? `/${move.to}` : relativePathBetween(newFromPath, move.to);
    return `[${label}](${nextHref}${hash}${suffix})`;
  });
}

export function relativePathBetween(fromFile: string, toFile: string): string {
  const fromDir = fromFile.split("/").slice(0, -1);
  const toParts = toFile.split("/");
  while (fromDir.length && toParts.length && fromDir[0] === toParts[0]) {
    fromDir.shift();
    toParts.shift();
  }
  const prefix = fromDir.map(() => "..");
  return [...prefix, ...toParts].join("/") || toFile.split("/").pop() || toFile;
}

function protectedMarkdownRanges(markdown: string): Array<[number, number]> {
  return [...rangesFor(markdown, FENCED_BLOCK_RE), ...rangesFor(markdown, IMAGE_LINK_RE)];
}

function rangesFor(markdown: string, regex: RegExp): Array<[number, number]> {
  return [...markdown.matchAll(regex)].map((match) => [match.index ?? 0, (match.index ?? 0) + match[0].length]);
}
