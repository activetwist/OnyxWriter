import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";

export const AGENT_AUDIT_LOG = ".onyx-agent-audit.jsonl";
export const INDEX_MANAGED_START = "<!-- onyxwriter:index:start -->";
export const INDEX_MANAGED_END = "<!-- onyxwriter:index:end -->";

const OKF_VERSION = "0.1";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg"]);
const IGNORED_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  ".vscode",
  "coverage",
  "vendor",
  AGENT_AUDIT_LOG,
]);
const EXTERNAL_LINK_RE = /^(https?:|mailto:)/i;
const LINK_RE = /(?<!!)\[([^\]]+)]\(([^)\s]+)([^)]*)\)/g;
const IMAGE_LINK_RE = /!\[[^\]]*]\([^)]+\)/g;
const FENCED_BLOCK_RE = /(```|~~~)[\s\S]*?\1/g;

export class OnyxCoreError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OnyxCoreError";
    this.code = code;
    this.details = details;
  }
}

export async function bundleInfo(root) {
  const rootPath = await ensureRoot(root);
  const tree = await listBundleTree(rootPath);
  const markdownPaths = collectMarkdownPaths(tree, { includeSystemFiles: true });
  return {
    rootPath,
    name: path.basename(rootPath),
    okfVersion: OKF_VERSION,
    markdownCount: markdownPaths.length,
    ignoredNames: [...IGNORED_NAMES].sort(),
    auditLog: AGENT_AUDIT_LOG,
  };
}

export async function listBundleTree(root, options = {}) {
  const rootPath = await ensureRoot(root);
  const rootName = path.basename(rootPath);
  const rootEntry = await listEntry(rootPath, rootPath, rootName, "", options);
  return rootEntry ?? { name: rootName, path: "", kind: "folder", reserved: false, children: [] };
}

export async function validateBundle(root) {
  const rootPath = await ensureRoot(root);
  const tree = await listBundleTree(rootPath, { includeOtherFiles: false });
  const markdownPaths = collectMarkdownPaths(tree, { includeSystemFiles: true });
  const knownPaths = new Set(markdownPaths);
  const documents = [];
  const diagnostics = [];
  for (const relativePath of markdownPaths) {
    const contents = await readText(rootPath, relativePath);
    const result = validateOkfText(relativePath, contents, knownPaths);
    documents.push({ path: relativePath, ...result });
    diagnostics.push(...result.errors, ...result.warnings, ...result.notices);
  }
  return {
    ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    rootPath,
    documentCount: markdownPaths.length,
    diagnostics,
    documents,
  };
}

export async function readDocument(root, relativePath) {
  const rootPath = await ensureRoot(root);
  const cleanPath = requireMarkdownPath(relativePath, { allowReserved: true });
  const absolutePath = await resolveExistingPath(rootPath, cleanPath);
  const contents = await fs.readFile(absolutePath, "utf8");
  const stat = await fs.stat(absolutePath);
  return {
    path: cleanPath,
    contents,
    hash: hashText(contents),
    mtimeMs: stat.mtimeMs,
  };
}

export async function createDocument(root, relativePath, options = {}) {
  const rootPath = await ensureRoot(root);
  const cleanPath = requireMarkdownPath(relativePath, { allowReserved: false });
  const absolutePath = await resolveNewPath(rootPath, cleanPath);
  const exists = await pathExists(absolutePath);
  if (exists) throw new OnyxCoreError("exists", `Document already exists: ${cleanPath}`, { path: cleanPath });
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const contents = ensureConceptDocument(cleanPath, options.contents ?? "", {
    type: options.type ?? "note",
    title: options.title ?? markdownTitleFallback(cleanPath),
  });
  await atomicWriteText(absolutePath, contents);
  await refreshManagedIndexes(rootPath);
  await appendAudit(rootPath, {
    caller: options.caller ?? "core",
    operation: "document.create",
    path: cleanPath,
    result: "ok",
  });
  const written = await readDocument(rootPath, cleanPath);
  return { ok: true, document: written };
}

export async function updateDocument(root, relativePath, contents, options = {}) {
  const rootPath = await ensureRoot(root);
  const cleanPath = requireMarkdownPath(relativePath, { allowReserved: false });
  const current = await readDocument(rootPath, cleanPath);
  assertWritePrecondition(current, options);
  const nextContents = ensureConceptDocument(cleanPath, contents, {
    type: options.type ?? "note",
    title: options.title ?? markdownTitleFallback(cleanPath),
  });
  const absolutePath = await resolveExistingPath(rootPath, cleanPath);
  await atomicWriteText(absolutePath, nextContents);
  await refreshManagedIndexes(rootPath);
  await appendAudit(rootPath, {
    caller: options.caller ?? "core",
    operation: "document.update",
    path: cleanPath,
    result: "ok",
  });
  return { ok: true, document: await readDocument(rootPath, cleanPath) };
}

export async function deletePath(root, relativePath, options = {}) {
  const rootPath = await ensureRoot(root);
  const cleanPath = normalizeWorkspacePath(relativePath);
  if (!cleanPath) throw new OnyxCoreError("unsafe_path", "Bundle root cannot be deleted.");
  if (isReservedMarkdown(cleanPath)) throw new OnyxCoreError("reserved", "Reserved system files cannot be deleted.", { path: cleanPath });
  const absolutePath = await resolveExistingPath(rootPath, cleanPath);
  await fs.rm(absolutePath, { recursive: true, force: false });
  await refreshManagedIndexes(rootPath);
  await appendAudit(rootPath, {
    caller: options.caller ?? "core",
    operation: "path.delete",
    path: cleanPath,
    result: "ok",
  });
  return { ok: true, path: cleanPath };
}

export async function movePath(root, fromPath, toPath, options = {}) {
  const rootPath = await ensureRoot(root);
  const cleanFrom = normalizeWorkspacePath(fromPath);
  const cleanTo = normalizeWorkspacePath(toPath);
  if (!cleanFrom || !cleanTo) throw new OnyxCoreError("unsafe_path", "Move paths must be inside the bundle.");
  if (cleanTo.startsWith(`${cleanFrom}/`)) throw new OnyxCoreError("unsafe_path", "Cannot move an item into itself.", { from: cleanFrom, to: cleanTo });
  if (isReservedMarkdown(cleanFrom) || isReservedMarkdown(cleanTo)) {
    throw new OnyxCoreError("reserved", "Reserved system files cannot be moved or renamed.", { from: cleanFrom, to: cleanTo });
  }
  const sourceAbsolute = await resolveExistingPath(rootPath, cleanFrom);
  const targetAbsolute = await resolveNewPath(rootPath, cleanTo);
  if (await pathExists(targetAbsolute)) throw new OnyxCoreError("exists", `Target already exists: ${cleanTo}`, { path: cleanTo });
  const movedMarkdown = await movedMarkdownPaths(rootPath, cleanFrom, cleanTo);
  await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });
  await fs.rename(sourceAbsolute, targetAbsolute);
  await repairLinksForMoves(rootPath, movedMarkdown);
  await refreshManagedIndexes(rootPath);
  await appendAudit(rootPath, {
    caller: options.caller ?? "core",
    operation: "path.move",
    path: cleanFrom,
    targetPath: cleanTo,
    result: "ok",
  });
  return { ok: true, from: cleanFrom, to: cleanTo, movedMarkdown };
}

export async function renamePath(root, relativePath, newName, options = {}) {
  const cleanPath = normalizeWorkspacePath(relativePath);
  const safeName = String(newName ?? "").trim();
  if (!safeName || safeName.includes("/") || safeName.includes("\\")) {
    throw new OnyxCoreError("unsafe_path", "New name must be a single path segment.");
  }
  const target = normalizeWorkspacePath([...cleanPath.split("/").slice(0, -1), safeName].filter(Boolean).join("/"));
  return movePath(root, cleanPath, target, { ...options, operation: "path.rename" });
}

export async function refreshManagedIndexes(root, options = {}) {
  const rootPath = await ensureRoot(root);
  const tree = await listBundleTree(rootPath, { includeOtherFiles: false });
  const directories = collectDirectoryPaths(tree);
  for (const directoryPath of directories) {
    const indexPath = indexPathForDirectory(directoryPath);
    const absolutePath = await resolvePath(rootPath, indexPath);
    const managedBlock = generateDirectoryIndexBlock(tree, directoryPath);
    const existing = (await pathExists(absolutePath)) ? await fs.readFile(absolutePath, "utf8") : defaultIndexContent(tree, directoryPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await atomicWriteText(absolutePath, updateManagedIndexContent(existing, managedBlock));
  }
  if (options.audit !== false) {
    await appendAudit(rootPath, {
      caller: options.caller ?? "core",
      operation: "index.refresh",
      path: "",
      result: "ok",
    });
  }
  return { ok: true, indexCount: directories.length };
}

export async function checkLinks(root) {
  const rootPath = await ensureRoot(root);
  const tree = await listBundleTree(rootPath, { includeOtherFiles: false });
  const markdownPaths = collectMarkdownPaths(tree, { includeSystemFiles: true });
  const knownPaths = new Set(markdownPaths);
  const links = [];
  for (const relativePath of markdownPaths) {
    const contents = await readText(rootPath, relativePath);
    links.push(...indexDocumentLinks(relativePath, contents, knownPaths));
  }
  return {
    ok: links.every((link) => !link.broken),
    links,
    broken: links.filter((link) => link.broken),
  };
}

export async function graphSummary(root) {
  const rootPath = await ensureRoot(root);
  const tree = await listBundleTree(rootPath, { includeOtherFiles: false });
  const markdownPaths = collectMarkdownPaths(tree, { includeSystemFiles: true });
  const knownPaths = new Set(markdownPaths);
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const addNode = (id, payload) => {
    if (nodeIds.has(id)) return;
    nodeIds.add(id);
    nodes.push({ id, ...payload, inbound: 0, outbound: 0 });
  };
  addNode("root:/", { path: "", label: path.basename(rootPath), kind: "root" });
  for (const entry of flattenTree(tree, { includeSystemFiles: true })) {
    if (!entry.path) continue;
    const kind = entry.kind === "folder" ? "folder" : isReservedMarkdown(entry.path) ? "system" : isEditableMarkdown(entry.path) ? "document" : entry.fileType ?? "other";
    addNode(`${kind}:${entry.path}`, {
      path: entry.path,
      label: entry.kind === "file" ? markdownTitleFallback(entry.path) : entry.name,
      kind,
    });
    const parentPath = entry.path.split("/").slice(0, -1).join("/");
    const parentId = parentPath ? `folder:${parentPath}` : "root:/";
    edges.push({ id: `contains:${parentId}->${kind}:${entry.path}`, source: parentId, target: `${kind}:${entry.path}`, kind: "contains" });
  }
  for (const relativePath of markdownPaths) {
    const contents = await readText(rootPath, relativePath);
    for (const link of indexDocumentLinks(relativePath, contents, knownPaths)) {
      if (link.kind !== "internal") continue;
      const targetKind = link.broken ? "broken" : isReservedMarkdown(link.targetPath ?? "") ? "system" : "document";
      const targetId = `${targetKind}:${link.targetPath || link.href}`;
      if (link.broken) addNode(targetId, { path: link.targetPath ?? "", label: link.href, kind: "broken" });
      edges.push({
        id: `${link.broken ? "broken-link" : "link"}:${relativePath}->${link.targetPath || link.href}`,
        source: `${isReservedMarkdown(relativePath) ? "system" : "document"}:${relativePath}`,
        target: targetId,
        kind: link.broken ? "broken-link" : "link",
        label: link.label || link.href,
        broken: link.broken,
      });
    }
  }
  for (const edge of edges) {
    if (edge.kind === "contains") continue;
    const source = nodes.find((node) => node.id === edge.source);
    const target = nodes.find((node) => node.id === edge.target);
    if (source) source.outbound += 1;
    if (target) target.inbound += 1;
  }
  return { nodes, edges };
}

export async function importAsset(root, sourcePath, options = {}) {
  const rootPath = await ensureRoot(root);
  const sourceAbsolute = path.resolve(String(sourcePath ?? ""));
  const extension = path.extname(sourceAbsolute).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) throw new OnyxCoreError("unsupported_asset", "Only image assets are supported.", { sourcePath });
  const safeName = sanitizeAssetFilename(path.basename(sourceAbsolute));
  const relativePath = normalizeWorkspacePath(["assets", "images", safeName].join("/"));
  const targetAbsolute = await resolveNewPath(rootPath, relativePath);
  await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });
  await fs.copyFile(sourceAbsolute, targetAbsolute);
  await appendAudit(rootPath, {
    caller: options.caller ?? "core",
    operation: "asset.import",
    path: relativePath,
    result: "ok",
  });
  return { ok: true, path: relativePath };
}

export async function readAsset(root, relativePath) {
  const rootPath = await ensureRoot(root);
  const cleanPath = normalizeWorkspacePath(relativePath);
  if (!IMAGE_EXTENSIONS.has(path.extname(cleanPath).toLowerCase())) {
    throw new OnyxCoreError("unsupported_asset", "Only image assets can be read through this API.", { path: cleanPath });
  }
  const absolutePath = await resolveExistingPath(rootPath, cleanPath);
  const data = await fs.readFile(absolutePath);
  return { path: cleanPath, mimeType: mimeTypeForPath(cleanPath), data: [...data] };
}

export function normalizeWorkspacePath(input) {
  if (path.isAbsolute(String(input ?? ""))) throw new OnyxCoreError("unsafe_path", "Absolute paths are not allowed inside a bundle.", { path: input });
  const parts = [];
  for (const part of String(input ?? "").replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") throw new OnyxCoreError("unsafe_path", "Path traversal is not allowed.", { path: input });
    parts.push(part);
  }
  return parts.join("/");
}

export function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function isReservedMarkdown(relativePath) {
  const name = String(relativePath).split("/").pop();
  return name === "index.md" || name === "log.md";
}

export function isEditableMarkdown(relativePath) {
  return relativePath.endsWith(".md") && !isReservedMarkdown(relativePath);
}

export function markdownTitleFallback(relativePath) {
  const basename = String(relativePath).split("/").pop()?.replace(/\.md$/i, "") ?? String(relativePath);
  return basename.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function ensureRoot(root) {
  const rootPath = path.resolve(String(root ?? ""));
  if (!rootPath) throw new OnyxCoreError("root_required", "A bundle root is required.");
  const stat = await fs.stat(rootPath).catch(() => null);
  if (!stat || !stat.isDirectory()) throw new OnyxCoreError("root_missing", `Bundle root does not exist: ${rootPath}`, { root: rootPath });
  return fs.realpath(rootPath);
}

async function listEntry(rootPath, absolutePath, name, relativePath, options) {
  if (relativePath && shouldIgnore(relativePath)) return null;
  const stat = await fs.stat(absolutePath);
  if (stat.isDirectory()) {
    const children = [];
    for (const childName of await fs.readdir(absolutePath)) {
      if (IGNORED_NAMES.has(childName)) continue;
      const childRelativePath = normalizeWorkspacePath([relativePath, childName].filter(Boolean).join("/"));
      const child = await listEntry(rootPath, path.join(absolutePath, childName), childName, childRelativePath, options).catch(() => null);
      if (child) children.push(child);
    }
    children.sort(sortEntries);
    return { name, path: relativePath, kind: "folder", reserved: false, children };
  }
  const fileType = fileTypeForPath(relativePath);
  if (!options.includeOtherFiles && fileType === "other") return null;
  return { name, path: relativePath, kind: "file", fileType, reserved: isReservedMarkdown(relativePath), children: [] };
}

function flattenTree(tree, options = {}) {
  const nodes = [];
  const visit = (entry, depth) => {
    if (!entry) return;
    if (entry.kind === "file" && entry.reserved && !options.includeSystemFiles) return;
    nodes.push({ ...entry, depth });
    for (const child of entry.children ?? []) visit(child, depth + 1);
  };
  visit(tree, 0);
  return nodes;
}

function collectMarkdownPaths(tree, options = {}) {
  return flattenTree(tree, options)
    .filter((entry) => entry.kind === "file" && entry.fileType === "markdown")
    .map((entry) => entry.path);
}

function collectDirectoryPaths(tree) {
  return flattenTree(tree, { includeSystemFiles: true })
    .filter((entry) => entry.kind === "folder")
    .map((entry) => entry.path);
}

function sortEntries(a, b) {
  if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function shouldIgnore(relativePath) {
  return relativePath.split("/").some((part) => IGNORED_NAMES.has(part));
}

function fileTypeForPath(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".md") return "markdown";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  return "other";
}

async function readText(rootPath, relativePath) {
  return fs.readFile(await resolveExistingPath(rootPath, relativePath), "utf8");
}

async function resolvePath(rootPath, relativePath) {
  const cleanPath = normalizeWorkspacePath(relativePath);
  const absolutePath = path.resolve(rootPath, cleanPath);
  const relative = path.relative(rootPath, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new OnyxCoreError("unsafe_path", "Resolved path escapes the bundle root.", { path: relativePath });
  }
  return absolutePath;
}

async function resolveExistingPath(rootPath, relativePath) {
  const absolutePath = await resolvePath(rootPath, relativePath);
  const realRoot = await fs.realpath(rootPath);
  const realPath = await fs.realpath(absolutePath);
  const relative = path.relative(realRoot, realPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new OnyxCoreError("unsafe_path", "Resolved path escapes the bundle root.", { path: relativePath });
  }
  return realPath;
}

async function resolveNewPath(rootPath, relativePath) {
  const absolutePath = await resolvePath(rootPath, relativePath);
  const parent = path.dirname(absolutePath);
  const realRoot = await fs.realpath(rootPath);
  const realParent = await fs.realpath(parent).catch(async () => {
    await fs.mkdir(parent, { recursive: true });
    return fs.realpath(parent);
  });
  const relative = path.relative(realRoot, realParent);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new OnyxCoreError("unsafe_path", "Resolved parent escapes the bundle root.", { path: relativePath });
  }
  return absolutePath;
}

function requireMarkdownPath(relativePath, options = {}) {
  const cleanPath = normalizeWorkspacePath(relativePath);
  if (!cleanPath.endsWith(".md")) throw new OnyxCoreError("unsupported_path", "Markdown document paths must end in .md.", { path: cleanPath });
  if (!options.allowReserved && isReservedMarkdown(cleanPath)) throw new OnyxCoreError("reserved", "Reserved system files cannot be mutated through document tools.", { path: cleanPath });
  return cleanPath;
}

async function pathExists(absolutePath) {
  return fs.access(absolutePath).then(() => true, () => false);
}

async function atomicWriteText(absolutePath, contents) {
  const tempPath = `${absolutePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, contents, "utf8");
  await fs.rename(tempPath, absolutePath);
}

function assertWritePrecondition(current, options) {
  if (options.expectedHash && options.expectedHash !== current.hash) {
    throw new OnyxCoreError("conflict", "Document hash does not match current file contents.", {
      path: current.path,
      expectedHash: options.expectedHash,
      actualHash: current.hash,
    });
  }
  if (options.expectedMtimeMs !== undefined && Number(options.expectedMtimeMs) !== current.mtimeMs) {
    throw new OnyxCoreError("conflict", "Document modified time does not match current file state.", {
      path: current.path,
      expectedMtimeMs: Number(options.expectedMtimeMs),
      actualMtimeMs: current.mtimeMs,
    });
  }
}

function ensureConceptDocument(relativePath, contents, defaults) {
  const normalized = String(contents ?? "").replace(/\r\n/g, "\n");
  if (normalized.startsWith("---\n")) return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
  const heading = firstHeading(normalized) || defaults.title || markdownTitleFallback(relativePath);
  const body = normalized.trim() ? normalized.trimStart() : `# ${heading}\n`;
  const frontmatter = YAML.stringify({ type: defaults.type || "note", title: heading }).trimEnd();
  return `---\n${frontmatter}\n---\n\n${body.endsWith("\n") ? body : `${body}\n`}`;
}

function firstHeading(markdown) {
  return markdown.split("\n").find((line) => /^# [^#]/.test(line))?.replace(/^# /, "").trim();
}

function parseDocument(relativePath, raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const kind = documentKindForPath(relativePath);
  if (!normalized.startsWith("---\n")) {
    return { path: relativePath, kind, hasFrontmatter: false, frontmatter: {}, body: normalized };
  }
  const closeIndex = normalized.indexOf("\n---", 4);
  if (closeIndex === -1) throw new OnyxCoreError("parse", "Unterminated YAML frontmatter block.", { path: relativePath });
  const frontmatterText = normalized.slice(4, closeIndex);
  let frontmatter;
  try {
    frontmatter = YAML.parse(frontmatterText) ?? {};
  } catch (error) {
    throw new OnyxCoreError("parse", `Invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`, { path: relativePath });
  }
  if (typeof frontmatter !== "object" || frontmatter === null || Array.isArray(frontmatter)) {
    throw new OnyxCoreError("parse", "Frontmatter must be a YAML mapping.", { path: relativePath });
  }
  let body = normalized.slice(closeIndex + "\n---".length);
  if (body.startsWith("\n")) body = body.slice(1);
  return { path: relativePath, kind, hasFrontmatter: true, frontmatter, body };
}

function documentKindForPath(relativePath) {
  const name = relativePath.split("/").pop() ?? "";
  if (name === "index.md") return "index";
  if (name === "log.md") return "log";
  return "concept";
}

function validateOkfText(relativePath, raw, knownPaths) {
  try {
    const document = parseDocument(relativePath, raw);
    const errors = [];
    const warnings = [];
    const notices = [];
    const name = relativePath.split("/").pop() ?? relativePath;
    if (document.kind === "concept") {
      if (!document.hasFrontmatter) errors.push(diagnostic("error", "frontmatter.missing", "Concept documents require YAML frontmatter.", relativePath));
      if (!stringValue(document.frontmatter.type)) errors.push(diagnostic("error", "frontmatter.type.required", "Concept frontmatter must include a non-empty type field.", relativePath));
      for (const key of ["title", "description", "timestamp"]) {
        if (!stringValue(document.frontmatter[key])) warnings.push(diagnostic("warning", `frontmatter.${key}.recommended`, `${key} is recommended for authoring quality.`, relativePath));
      }
      if (document.frontmatter.tags !== undefined && !Array.isArray(document.frontmatter.tags)) {
        warnings.push(diagnostic("warning", "frontmatter.tags.shape", "tags should be a YAML list of short strings.", relativePath));
      }
    }
    if (document.kind === "index") {
      const isRootIndex = relativePath === "index.md";
      if (document.hasFrontmatter && !isRootIndex) errors.push(diagnostic("error", "index.frontmatter", "Only the bundle-root index.md may declare frontmatter.", relativePath));
      if (isRootIndex && document.hasFrontmatter && document.frontmatter.okf_version && document.frontmatter.okf_version !== OKF_VERSION) {
        warnings.push(diagnostic("warning", "index.okf_version.unknown", "Unknown OKF version; attempting best-effort consumption.", relativePath));
      }
    }
    if (document.kind === "log" && document.hasFrontmatter) errors.push(diagnostic("error", "log.frontmatter", "log.md files do not support frontmatter.", relativePath));
    if (name === "log.md") {
      for (const line of document.body.split("\n")) {
        if (/^## /.test(line) && !/^## \d{4}-\d{2}-\d{2}$/.test(line.trim())) {
          errors.push(diagnostic("error", "log.date", "log.md date headings must use YYYY-MM-DD.", relativePath));
        }
      }
    }
    for (const link of indexDocumentLinks(relativePath, document.body, knownPaths)) {
      if (link.broken) warnings.push(diagnostic("warning", "link.broken", `Internal link target is not present: ${link.href}`, relativePath));
    }
    return { errors, warnings, notices };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { errors: [diagnostic("error", "parse", message, relativePath)], warnings: [], notices: [] };
  }
}

function diagnostic(severity, code, message, diagnosticPath) {
  return { severity, code, message, path: diagnosticPath };
}

function stringValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function indexDocumentLinks(fromPath, markdown, knownPaths) {
  const withoutImages = markdown.replace(IMAGE_LINK_RE, "");
  return extractMarkdownLinks(withoutImages, fromPath, knownPaths).map((link) => {
    const classified = classifyLink(link.href);
    const kind = link.targetPath ? "internal" : classified === "external" ? "external" : classified === "anchor" ? "anchor" : "other";
    return { fromPath, href: link.href, label: link.label, targetPath: link.targetPath ? stripHash(link.targetPath) : undefined, kind, broken: Boolean(link.broken) };
  });
}

function extractMarkdownLinks(markdown, fromPath, knownPaths) {
  const protectedRanges = protectedMarkdownRanges(markdown);
  return [...markdown.matchAll(LINK_RE)].map((match) => {
    const offset = match.index ?? 0;
    if (protectedRanges.some(([start, end]) => offset >= start && offset < end)) return null;
    const href = match[2] ?? "";
    const targetPath = resolveInternalLink(href, fromPath);
    const strippedTarget = targetPath ? stripHash(targetPath) : undefined;
    return {
      label: match[1] ?? "",
      href,
      targetPath,
      broken: Boolean(strippedTarget && !knownPaths.has(strippedTarget)),
    };
  }).filter(Boolean);
}

function classifyLink(href) {
  if (!href) return "other";
  if (EXTERNAL_LINK_RE.test(href)) return "external";
  if (href.startsWith("#")) return "anchor";
  if (href.startsWith("/") || href.endsWith(".md") || href.includes(".md#") || href.startsWith("../") || href.startsWith("./")) return "internal";
  return "other";
}

function resolveInternalLink(href, fromPath) {
  if (classifyLink(href) !== "internal") return undefined;
  const [rawTarget, hash] = href.split("#");
  const withoutLeadingSlash = rawTarget.startsWith("/") ? rawTarget.slice(1) : rawTarget;
  const baseDir = fromPath.split("/").slice(0, -1).join("/");
  const target = rawTarget.startsWith("/") ? withoutLeadingSlash : normalizeWorkspacePath([baseDir, withoutLeadingSlash].filter(Boolean).join("/"));
  return hash ? `${target}#${hash}` : target;
}

function protectedMarkdownRanges(markdown) {
  return [...rangesFor(markdown, FENCED_BLOCK_RE), ...rangesFor(markdown, IMAGE_LINK_RE)];
}

function rangesFor(markdown, regex) {
  return [...markdown.matchAll(regex)].map((match) => [match.index ?? 0, (match.index ?? 0) + match[0].length]);
}

function stripHash(value) {
  return String(value).split("#")[0] ?? String(value);
}

async function movedMarkdownPaths(rootPath, cleanFrom, cleanTo) {
  const sourceAbsolute = await resolveExistingPath(rootPath, cleanFrom);
  const stat = await fs.stat(sourceAbsolute);
  if (stat.isFile()) return cleanFrom.endsWith(".md") && !isReservedMarkdown(cleanFrom) ? [{ from: cleanFrom, to: cleanTo }] : [];
  const paths = [];
  const walk = async (absoluteDirectory, relativeDirectory) => {
    for (const entry of await fs.readdir(absoluteDirectory, { withFileTypes: true })) {
      if (IGNORED_NAMES.has(entry.name)) continue;
      const relative = normalizeWorkspacePath([relativeDirectory, entry.name].filter(Boolean).join("/"));
      const absolute = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) await walk(absolute, relative);
      if (entry.isFile() && relative.endsWith(".md") && !isReservedMarkdown(relative)) {
        paths.push({ from: relative, to: relative.replace(cleanFrom, cleanTo) });
      }
    }
  };
  await walk(sourceAbsolute, cleanFrom);
  return paths;
}

async function repairLinksForMoves(rootPath, movedPaths) {
  if (!movedPaths.length) return;
  const tree = await listBundleTree(rootPath, { includeOtherFiles: false });
  const markdownPaths = collectMarkdownPaths(tree, { includeSystemFiles: true });
  for (const relativePath of markdownPaths) {
    const absolutePath = await resolveExistingPath(rootPath, relativePath);
    const markdown = await fs.readFile(absolutePath, "utf8");
    const repaired = repairMovedLinks(markdown, relativePath, movedPaths);
    if (repaired !== markdown) await atomicWriteText(absolutePath, repaired);
  }
}

function repairMovedLinks(markdown, fromPath, movedPaths) {
  const protectedRanges = protectedMarkdownRanges(markdown);
  return markdown.replace(LINK_RE, (full, label, href, suffix, offset) => {
    if (protectedRanges.some(([start, end]) => offset >= start && offset < end)) return full;
    if (classifyLink(href) !== "internal") return full;
    const resolved = resolveInternalLink(href, fromPath)?.split("#")[0];
    const move = movedPaths.find((candidate) => resolved === candidate.from);
    if (!move) return full;
    const hash = href.includes("#") ? `#${href.split("#").slice(1).join("#")}` : "";
    const nextHref = href.startsWith("/") ? `/${move.to}` : relativePathBetween(fromPath, move.to);
    return `[${label}](${nextHref}${hash}${suffix})`;
  });
}

function relativePathBetween(fromFile, toFile) {
  const fromDir = fromFile.split("/").slice(0, -1);
  const toParts = toFile.split("/");
  while (fromDir.length && toParts.length && fromDir[0] === toParts[0]) {
    fromDir.shift();
    toParts.shift();
  }
  const prefix = fromDir.map(() => "..");
  return [...prefix, ...toParts].join("/") || toFile.split("/").pop() || toFile;
}

function generateDirectoryIndexBlock(tree, directoryPath = "", heading = "Documents") {
  const directory = findDirectory(tree, directoryPath);
  const children = (directory?.children ?? []).filter((child) => !shouldIgnore(child.path));
  const folders = children
    .filter((child) => child.kind === "folder")
    .sort(sortEntries)
    .map((folder) => `- [${folder.name}](${relativeIndexHref(directoryPath, `${folder.path}/index.md`)})`);
  const files = children
    .filter((child) => child.kind === "file" && isEditableMarkdown(child.path))
    .sort(sortEntries)
    .map((file) => `- [${markdownTitleFallback(file.path)}](${relativeIndexHref(directoryPath, file.path)})`);
  const lines = [...folders, ...files];
  return [INDEX_MANAGED_START, `## ${heading}`, "", ...(lines.length ? lines : ["- No concept documents yet."]), INDEX_MANAGED_END].join("\n");
}

function updateManagedIndexContent(existing, managedBlock) {
  const normalized = existing.replace(/\r\n/g, "\n").trimEnd();
  const start = normalized.indexOf(INDEX_MANAGED_START);
  const end = normalized.indexOf(INDEX_MANAGED_END);
  if (start !== -1 && end !== -1 && end > start) {
    const before = normalized.slice(0, start).trimEnd();
    const after = normalized.slice(end + INDEX_MANAGED_END.length).trimStart();
    return [before, managedBlock, after].filter(Boolean).join("\n\n") + "\n";
  }
  return [normalized || "# Index", managedBlock].filter(Boolean).join("\n\n") + "\n";
}

function defaultIndexContent(tree, directoryPath = "") {
  const normalized = directoryPath ? normalizeWorkspacePath(directoryPath) : "";
  const title = normalized ? markdownTitleFallback(normalized) : "Index";
  const frontmatter = normalized ? "" : `---\nokf_version: "${OKF_VERSION}"\n---\n\n`;
  return `${frontmatter}# ${title}\n\n${generateDirectoryIndexBlock(tree, normalized)}\n`;
}

function indexPathForDirectory(directoryPath = "") {
  const normalized = directoryPath ? normalizeWorkspacePath(directoryPath) : "";
  return normalized ? `${normalized}/index.md` : "index.md";
}

function findDirectory(tree, directoryPath) {
  const normalized = directoryPath ? normalizeWorkspacePath(directoryPath) : "";
  const visit = (entry) => {
    if (!entry) return null;
    if (entry.kind === "folder" && entry.path === normalized) return entry;
    for (const child of entry.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(tree);
}

function relativeIndexHref(fromDirectoryPath, targetPath) {
  const normalizedFrom = fromDirectoryPath ? normalizeWorkspacePath(fromDirectoryPath) : "";
  const normalizedTarget = normalizeWorkspacePath(targetPath);
  if (!normalizedFrom) return normalizedTarget;
  const prefix = `${normalizedFrom}/`;
  return normalizedTarget.startsWith(prefix) ? normalizedTarget.slice(prefix.length) : normalizedTarget;
}

function sanitizeAssetFilename(filename) {
  const name = String(filename).split(/[\\/]/).pop()?.trim() || "image.png";
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "image.png";
}

function mimeTypeForPath(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if (extension === ".bmp") return "image/bmp";
  return "application/octet-stream";
}

async function appendAudit(rootPath, event) {
  const record = {
    timestamp: new Date().toISOString(),
    caller: event.caller ?? "unknown",
    operation: event.operation,
    path: event.path ?? "",
    targetPath: event.targetPath,
    result: event.result ?? "ok",
    code: event.code,
  };
  await fs.appendFile(path.join(rootPath, AGENT_AUDIT_LOG), `${JSON.stringify(record)}\n`, "utf8").catch(() => undefined);
}
