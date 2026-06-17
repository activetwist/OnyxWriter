import { classifyLink, extractMarkdownLinks } from "../okf/links";

export interface IndexedDocumentLink {
  fromPath: string;
  href: string;
  label: string;
  targetPath?: string;
  kind: "internal" | "external" | "anchor" | "other";
  broken: boolean;
}

export function indexDocumentLinks(fromPath: string, markdown: string, knownPaths: Set<string>): IndexedDocumentLink[] {
  const withoutImages = markdown.replace(/!\[[^\]]*]\([^)]+\)/g, "");
  return extractMarkdownLinks(withoutImages, fromPath, knownPaths).map((link) => {
    const kind = link.targetPath ? "internal" : classifyLink(link.href) === "external" ? "external" : classifyLink(link.href) === "anchor" ? "anchor" : "other";
    return {
      fromPath,
      href: link.href,
      label: link.label,
      targetPath: link.targetPath ? stripHash(link.targetPath) : undefined,
      kind,
      broken: Boolean(link.broken),
    };
  });
}

function stripHash(value: string): string {
  return value.split("#")[0] ?? value;
}
