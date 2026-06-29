import { promises as fs } from "node:fs";
import path from "node:path";
import { decryptJson, encryptJson, generateBundleDataKey, sha256Hex, unwrapBundleDataKey, wrapBundleDataKey } from "../crypto/envelope.mjs";

export const SEALED_BUNDLE_VERSION = 1;

const DEFAULT_IGNORES = new Set([
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
]);

export class OnyxSealedBundleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OnyxSealedBundleError";
    this.code = code;
    this.details = details;
  }
}

export async function sealDirectoryBundle(sourceRoot, targetFile, passphrase, options = {}) {
  const rootPath = path.resolve(sourceRoot);
  const files = await collectBundleFiles(rootPath);
  const archive = {
    format: "onyx.sealed-bundle.archive",
    version: SEALED_BUNDLE_VERSION,
    bundleName: options.name ?? path.basename(rootPath),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    files,
  };
  await writeSealedArchive(targetFile, passphrase, archive);
  return { ok: true, targetFile: path.resolve(targetFile), fileCount: Object.keys(files).length, hash: sha256Hex(JSON.stringify(archive)) };
}

export async function openSealedBundle(targetFile, passphrase) {
  const sealed = JSON.parse(await fs.readFile(targetFile, "utf8"));
  if (sealed.format !== "onyx.sealed-bundle" || sealed.version !== SEALED_BUNDLE_VERSION) {
    throw new OnyxSealedBundleError("unsupported_format", "Unsupported sealed bundle format.", { version: sealed.version });
  }
  const dataKey = unwrapBundleDataKey(passphrase, sealed.crypto?.dataKey);
  const archive = decryptJson(dataKey, sealed.archive, "onyxwriter:sealed-bundle:v1");
  return { targetFile: path.resolve(targetFile), header: publicSealedHeader(sealed), archive };
}

export async function readSealedDocument(targetFile, passphrase, relativePath) {
  const sealed = await openSealedBundle(targetFile, passphrase);
  const cleanPath = requireSafePath(relativePath);
  const file = sealed.archive.files[cleanPath];
  if (!file) throw new OnyxSealedBundleError("not_found", `Sealed bundle document not found: ${cleanPath}`, { path: cleanPath });
  if (file.kind !== "document") throw new OnyxSealedBundleError("invalid_path", `Not a Markdown document: ${cleanPath}`, { path: cleanPath });
  return { path: cleanPath, contents: Buffer.from(file.data, "base64").toString("utf8"), hash: file.hash };
}

export async function updateSealedDocument(targetFile, passphrase, relativePath, contents) {
  const sealed = await openSealedBundle(targetFile, passphrase);
  const cleanPath = requireSafePath(relativePath);
  if (!cleanPath.endsWith(".md")) throw new OnyxSealedBundleError("invalid_path", "Sealed document path must end in .md.", { path: cleanPath });
  const bytes = Buffer.from(String(contents), "utf8");
  const nextArchive = {
    ...sealed.archive,
    updatedAt: new Date().toISOString(),
    files: {
      ...sealed.archive.files,
      [cleanPath]: {
        kind: "document",
        mediaType: "text/markdown",
        data: bytes.toString("base64"),
        hash: sha256Hex(bytes),
        size: bytes.length,
      },
    },
  };
  await writeSealedArchive(targetFile, passphrase, nextArchive);
  return { ok: true, targetFile: path.resolve(targetFile), path: cleanPath, hash: sha256Hex(bytes) };
}

async function writeSealedArchive(targetFile, passphrase, archive) {
  const dataKey = generateBundleDataKey();
  const now = new Date().toISOString();
  const sealed = {
    format: "onyx.sealed-bundle",
    version: SEALED_BUNDLE_VERSION,
    createdAt: archive.createdAt ?? now,
    updatedAt: now,
    crypto: {
      dataKey: wrapBundleDataKey(passphrase, dataKey),
    },
    archive: encryptJson(dataKey, archive, "onyxwriter:sealed-bundle:v1"),
  };
  const targetPath = path.resolve(targetFile);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmp = path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tmp, `${JSON.stringify(sealed, null, 2)}\n`);
  await fs.rename(tmp, targetPath);
}

async function collectBundleFiles(rootPath, current = rootPath, out = {}) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (DEFAULT_IGNORES.has(entry.name)) continue;
    const absolutePath = path.join(current, entry.name);
    const relativePath = path.relative(rootPath, absolutePath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      await collectBundleFiles(rootPath, absolutePath, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const bytes = await fs.readFile(absolutePath);
    out[relativePath] = {
      kind: relativePath.toLowerCase().endsWith(".md") ? "document" : "asset",
      mediaType: relativePath.toLowerCase().endsWith(".md") ? "text/markdown" : "application/octet-stream",
      data: bytes.toString("base64"),
      hash: sha256Hex(bytes),
      size: bytes.length,
    };
  }
  return out;
}

function publicSealedHeader(header) {
  return {
    format: header.format,
    version: header.version,
    createdAt: header.createdAt,
    updatedAt: header.updatedAt,
    kdf: header.crypto?.dataKey?.kdf ? { ...header.crypto.dataKey.kdf, salt: "<redacted>" } : undefined,
  };
}

function requireSafePath(relativePath) {
  const clean = String(relativePath ?? "").replace(/\\/g, "/").split("/").filter(Boolean).join("/");
  if (!clean || clean.startsWith("/") || clean.includes("../") || clean === ".." || clean.includes("\0")) {
    throw new OnyxSealedBundleError("unsafe_path", "Path must be bundle-relative.", { path: relativePath });
  }
  return clean;
}
