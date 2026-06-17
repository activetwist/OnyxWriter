import { OkfParseError, parseOkfDocument } from "./frontmatter";
import { extractMarkdownLinks } from "./links";
import type { OkfDiagnostic, OkfDocument, ValidationResult } from "./types";

export function validateOkfText(path: string, raw: string, knownPaths: Set<string> = new Set()): ValidationResult {
  try {
    return validateOkfDocument(parseOkfDocument(path, raw), knownPaths);
  } catch (error) {
    const message = error instanceof OkfParseError ? error.message : String(error);
    return result([{ severity: "error", code: "parse", message, path }], []);
  }
}

export function validateOkfDocument(document: OkfDocument, knownPaths: Set<string> = new Set()): ValidationResult {
  const errors: OkfDiagnostic[] = [];
  const warnings: OkfDiagnostic[] = [];
  const name = document.path.split("/").pop() ?? document.path;

  if (document.kind === "concept") {
    if (!document.hasFrontmatter) {
      errors.push({ severity: "error", code: "frontmatter.missing", message: "Concept documents require YAML frontmatter.", path: document.path });
    }
    if (!stringValue(document.frontmatter.type)) {
      errors.push({ severity: "error", code: "frontmatter.type.required", message: "Concept frontmatter must include a non-empty type field.", path: document.path });
    }
    for (const key of ["title", "description", "timestamp"]) {
      if (!stringValue(document.frontmatter[key])) {
        warnings.push({ severity: "warning", code: `frontmatter.${key}.recommended`, message: `${key} is recommended for authoring quality.`, path: document.path });
      }
    }
    if (document.frontmatter.tags !== undefined && !Array.isArray(document.frontmatter.tags)) {
      warnings.push({ severity: "warning", code: "frontmatter.tags.shape", message: "tags should be a YAML list of short strings.", path: document.path });
    }
  }

  if (document.kind === "index") {
    const isRootIndex = document.path === "index.md";
    if (document.hasFrontmatter && !isRootIndex) {
      errors.push({ severity: "error", code: "index.frontmatter", message: "Only the bundle-root index.md may declare frontmatter.", path: document.path });
    }
    if (isRootIndex && document.hasFrontmatter && document.frontmatter.okf_version && document.frontmatter.okf_version !== "0.1") {
      warnings.push({ severity: "warning", code: "index.okf_version.unknown", message: "Unknown OKF version; attempting best-effort consumption.", path: document.path });
    }
  }

  if (document.kind === "log" && document.hasFrontmatter) {
    errors.push({ severity: "error", code: "log.frontmatter", message: "log.md files do not support frontmatter.", path: document.path });
  }

  if (name === "log.md") {
    for (const line of document.body.split("\n")) {
      if (/^## /.test(line) && !/^## \d{4}-\d{2}-\d{2}$/.test(line.trim())) {
        errors.push({ severity: "error", code: "log.date", message: "log.md date headings must use YYYY-MM-DD.", path: document.path });
      }
    }
  }

  for (const link of extractMarkdownLinks(document.body, document.path, knownPaths)) {
    if (link.broken) {
      warnings.push({ severity: "warning", code: "link.broken", message: `Internal link target is not present: ${link.href}`, path: document.path });
    }
  }

  return result(errors, warnings);
}

function stringValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function result(errors: OkfDiagnostic[], warnings: OkfDiagnostic[], notices: OkfDiagnostic[] = []): ValidationResult {
  return { errors, warnings, notices };
}
