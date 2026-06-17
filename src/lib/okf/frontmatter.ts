import YAML from "yaml";
import type { Frontmatter, OkfDocument, OkfDocumentKind } from "./types";

const FRONTMATTER_DELIMITER = "---";
const PREFERRED_KEY_ORDER = ["type", "resource", "title", "description", "tags", "timestamp"];

export class OkfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OkfParseError";
  }
}

export function documentKindForPath(path: string): OkfDocumentKind {
  const name = path.split("/").pop() ?? "";
  if (name === "index.md") return "index";
  if (name === "log.md") return "log";
  return "concept";
}

export function parseOkfDocument(path: string, raw: string): OkfDocument {
  const normalized = raw.replace(/\r\n/g, "\n");
  const kind = documentKindForPath(path);
  if (!normalized.startsWith(`${FRONTMATTER_DELIMITER}\n`)) {
    return {
      path,
      kind,
      frontmatter: {},
      body: normalized,
      raw,
      hasFrontmatter: false,
    };
  }

  const closeIndex = normalized.indexOf(`\n${FRONTMATTER_DELIMITER}`, FRONTMATTER_DELIMITER.length + 1);
  if (closeIndex === -1) {
    throw new OkfParseError("Unterminated YAML frontmatter block");
  }

  const frontmatterText = normalized.slice(FRONTMATTER_DELIMITER.length + 1, closeIndex);
  let parsed: unknown;
  try {
    parsed = YAML.parse(frontmatterText) ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new OkfParseError(`Invalid YAML frontmatter: ${message}`);
  }
  if (!isPlainObject(parsed)) {
    throw new OkfParseError("Frontmatter must be a YAML mapping");
  }

  let body = normalized.slice(closeIndex + `\n${FRONTMATTER_DELIMITER}`.length);
  if (body.startsWith("\n")) body = body.slice(1);

  return {
    path,
    kind,
    frontmatter: parsed as Frontmatter,
    body,
    raw,
    hasFrontmatter: true,
  };
}

export function serializeOkfDocument(document: Pick<OkfDocument, "frontmatter" | "body">): string {
  const ordered = orderFrontmatter(document.frontmatter);
  const frontmatterText = YAML.stringify(ordered).trimEnd();
  const body = document.body.endsWith("\n") ? document.body : `${document.body}\n`;
  return `${FRONTMATTER_DELIMITER}\n${frontmatterText}\n${FRONTMATTER_DELIMITER}\n\n${body}`;
}

export function orderFrontmatter(frontmatter: Frontmatter): Frontmatter {
  const out: Frontmatter = {};
  for (const key of PREFERRED_KEY_ORDER) {
    if (Object.prototype.hasOwnProperty.call(frontmatter, key)) {
      out[key] = frontmatter[key];
    }
  }
  for (const [key, value] of Object.entries(frontmatter)) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = value;
    }
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
