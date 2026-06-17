import { analyzeMarkdownCapabilities, type MarkdownCapabilityReport } from "./markdownCapabilities";
import { stripMermaidBlocks } from "./mermaidBlocks";

export interface VisualDocument {
  html: string;
  rawModeRecommended: boolean;
  capabilityReport: MarkdownCapabilityReport;
}

export function markdownToVisual(markdown: string): VisualDocument {
  const capabilityReport = analyzeMarkdownCapabilities(markdown);
  const editableMarkdown = stripMermaidBlocks(markdown);
  return {
    html: splitMarkdownBlocks(editableMarkdown)
      .map((block) => blockToHtml(block))
      .join(""),
    rawModeRecommended: !capabilityReport.safeForVisualEditing,
    capabilityReport,
  };
}

export function visualHtmlToMarkdown(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;
  const blocks: string[] = [];
  container.childNodes.forEach((node) => {
    blocks.push(nodeToMarkdown(node).trimEnd());
  });
  return `${blocks.filter(Boolean).join("\n\n")}\n`;
}

function blockToHtml(block: string): string {
  if (isMarkdownTable(block)) return tableMarkdownToHtml(block);
  if (/^!\[[^\]]*]\([^)]+(?:\s+"[^"]*")?\)$/.test(block.trim())) return imageMarkdownToHtml(block.trim());
  if (/^# /.test(block)) return `<h1>${escapeHtml(block.replace(/^# /, ""))}</h1>`;
  if (/^## /.test(block)) return `<h2>${escapeHtml(block.replace(/^## /, ""))}</h2>`;
  if (/^### /.test(block)) return `<h3>${escapeHtml(block.replace(/^### /, ""))}</h3>`;
  if (/^- /.test(block)) {
    const items = block.split("\n").filter(Boolean).map((line) => `<li>${inlineMarkdownToHtml(line.replace(/^- /, ""))}</li>`);
    return `<ul>${items.join("")}</ul>`;
  }
  if (/^\d+\. /.test(block)) {
    const items = block.split("\n").filter(Boolean).map((line) => `<li>${inlineMarkdownToHtml(line.replace(/^\d+\. /, ""))}</li>`);
    return `<ol>${items.join("")}</ol>`;
  }
  return `<p>${inlineMarkdownToHtml(block.replace(/\n/g, " "))}</p>`;
}

function inlineMarkdownToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const text = inlineHtmlToMarkdown(node);
  if (node.tagName === "H1") return `# ${text}`;
  if (node.tagName === "H2") return `## ${text}`;
  if (node.tagName === "H3") return `### ${text}`;
  if (node.tagName === "UL") {
    return Array.from(node.querySelectorAll(":scope > li"))
      .map((li) => `- ${inlineHtmlToMarkdown(li as HTMLElement)}`)
      .join("\n");
  }
  if (node.tagName === "OL") {
    return Array.from(node.querySelectorAll(":scope > li"))
      .map((li, index) => `${index + 1}. ${inlineHtmlToMarkdown(li as HTMLElement)}`)
      .join("\n");
  }
  if (node.tagName === "TABLE") return tableHtmlToMarkdown(node);
  if (node.tagName === "IMG") return imageHtmlToMarkdown(node as HTMLImageElement);
  return text;
}

function inlineHtmlToMarkdown(node: HTMLElement): string {
  let out = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) out += child.textContent ?? "";
    else if (child instanceof HTMLAnchorElement) out += `[${child.textContent ?? ""}](${child.getAttribute("href") ?? ""})`;
    else if (child instanceof HTMLElement && child.tagName === "CODE") out += `\`${child.textContent ?? ""}\``;
    else if (child instanceof HTMLElement && child.tagName === "STRONG") out += `**${inlineHtmlToMarkdown(child)}**`;
    else if (child instanceof HTMLElement && child.tagName === "EM") out += `*${inlineHtmlToMarkdown(child)}*`;
    else if (child instanceof HTMLImageElement) out += imageHtmlToMarkdown(child);
    else if (child instanceof HTMLElement) out += inlineHtmlToMarkdown(child);
  });
  return out;
}

function splitMarkdownBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let current: string[] = [];
  const flush = () => {
    if (current.length) blocks.push(current.join("\n"));
    current = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      flush();
      continue;
    }
    if (isTableLine(line)) {
      flush();
      const table: string[] = [];
      while (index < lines.length && isTableLine(lines[index])) {
        table.push(lines[index]);
        index += 1;
      }
      index -= 1;
      blocks.push(table.join("\n"));
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

function isMarkdownTable(block: string): boolean {
  const lines = block.split("\n").filter(Boolean);
  return lines.length >= 2 && lines.every(isTableLine) && splitTableRow(lines[0]).length === splitTableRow(lines[1]).length;
}

function isTableLine(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  return trimmed.slice(1, trimmed.endsWith("|") ? -1 : undefined).split("|").map((cell) => cell.trim());
}

function tableMarkdownToHtml(block: string): string {
  const [headerLine, , ...bodyLines] = block.split("\n").filter(Boolean);
  const headers = splitTableRow(headerLine);
  const rows = bodyLines.map(splitTableRow);
  return `<table><thead><tr>${headers.map((cell) => `<th>${inlineMarkdownToHtml(cell)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdownToHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function tableHtmlToMarkdown(node: HTMLElement): string {
  const headerCells = Array.from(node.querySelectorAll("thead tr:first-child th, tr:first-child th"));
  const headers = headerCells.map((cell) => inlineHtmlToMarkdown(cell as HTMLElement));
  const bodyRows = Array.from(node.querySelectorAll("tbody tr"));
  const rows = bodyRows.map((row) => Array.from(row.children).map((cell) => inlineHtmlToMarkdown(cell as HTMLElement)));
  const width = headers.length || rows[0]?.length || 0;
  const safeHeaders = headers.length ? headers : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  return [
    `| ${safeHeaders.join(" | ")} |`,
    `| ${safeHeaders.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${Array.from({ length: safeHeaders.length }, (_, index) => row[index] ?? "").join(" | ")} |`),
  ].join("\n");
}

function imageMarkdownToHtml(markdown: string): string {
  const match = markdown.match(/^!\[([^\]]*)]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
  if (!match) return `<p>${inlineMarkdownToHtml(markdown)}</p>`;
  const [, alt, src, title] = match;
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ""}>`;
}

function imageHtmlToMarkdown(image: HTMLImageElement): string {
  const alt = image.getAttribute("alt") ?? "";
  const src = image.getAttribute("src") ?? "";
  const title = image.getAttribute("title");
  return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
