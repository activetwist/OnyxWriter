import type { OkfLink } from "./types";

const MARKDOWN_LINK_RE = /(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function extractMarkdownLinks(markdown: string, fromPath: string, knownPaths: Set<string> = new Set()): OkfLink[] {
  const links: OkfLink[] = [];
  for (const match of markdown.matchAll(MARKDOWN_LINK_RE)) {
    const label = match[1] ?? "";
    const href = match[2] ?? "";
    const kind = classifyLink(href);
    const targetPath = resolveInternalLink(href, fromPath);
    const broken = targetPath ? knownPaths.size > 0 && !knownPaths.has(stripHash(targetPath)) : false;
    links.push({ label, href, kind, targetPath, broken });
  }
  return links;
}

export function classifyLink(href: string): OkfLink["kind"] {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href) || href.startsWith("mailto:")) return "external";
  if (href.startsWith("#")) return "anchor";
  if (href.startsWith("/")) return "bundle-absolute";
  if (href.endsWith(".md") || href.includes(".md#")) return "relative";
  return "other";
}

export function isOpenableExternalHref(href: string): boolean {
  return normalizeOpenableExternalHref(href) !== undefined;
}

export function normalizeOpenableExternalHref(href: string): string | undefined {
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") return url.href;
    return undefined;
  } catch {
    return undefined;
  }
}

export function resolveInternalLink(href: string, fromPath: string): string | undefined {
  if (classifyLink(href) === "bundle-absolute") return stripLeadingSlash(href);
  if (classifyLink(href) !== "relative") return undefined;
  const fromParts = fromPath.split("/").slice(0, -1);
  const targetParts = href.split("/");
  const stack = [...fromParts];
  for (const part of targetParts) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

export function relativeMarkdownHref(fromPath: string, targetPath: string): string {
  const fromParts = stripHash(fromPath).split("/").filter(Boolean).slice(0, -1);
  const targetParts = stripHash(targetPath).split("/").filter(Boolean);
  let common = 0;
  while (common < fromParts.length && common < targetParts.length && fromParts[common] === targetParts[common]) {
    common += 1;
  }
  const upward = fromParts.slice(common).map(() => "..");
  const downward = targetParts.slice(common);
  const href = [...upward, ...downward].join("/");
  return href || targetParts.at(-1) || targetPath;
}

export function conceptIdFromPath(path: string): string {
  return stripHash(path).replace(/\.md$/, "");
}

function stripLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

function stripHash(value: string): string {
  return value.split("#")[0] ?? value;
}
