import { promises as fs } from "node:fs";
import path from "node:path";
import {
  decryptJson,
  decryptText,
  encryptJson,
  encryptText,
  generateBundleDataKey,
  sha256Hex,
  unwrapBundleDataKey,
  wrapBundleDataKey,
} from "../crypto/envelope.mjs";

export const ENCRYPTED_FOLDER_HEADER = "onyx-encrypted-folder.json";
export const ENCRYPTED_FOLDER_DIR = ".onyx-encrypted";
export const ENCRYPTED_MANIFEST = "manifest.enc.json";
export const ENCRYPTED_OBJECTS_DIR = "objects";
export const ENCRYPTED_TMP_DIR = "tmp";
export const ENCRYPTED_FOLDER_VERSION = 1;

const DEFAULT_INDEX = `---\ntype: Index\ntitle: Bundle Index\n---\n\n# Bundle Index\n\nThis encrypted Onyx Writer bundle is managed locally.\n`;
const DEFAULT_LOG = `---\ntype: Log\ntitle: Bundle Log\n---\n\n# Bundle Log\n\n`;

export class OnyxStorageError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OnyxStorageError";
    this.code = code;
    this.details = details;
  }
}

export async function initializeEncryptedFolder(root, passphrase, options = {}) {
  const rootPath = path.resolve(root);
  await fs.mkdir(rootPath, { recursive: true });
  const headerPath = path.join(rootPath, ENCRYPTED_FOLDER_HEADER);
  if (await pathExists(headerPath)) throw new OnyxStorageError("exists", "Encrypted bundle already exists.", { root: rootPath });
  await fs.mkdir(path.join(rootPath, ENCRYPTED_FOLDER_DIR, ENCRYPTED_OBJECTS_DIR), { recursive: true });
  await fs.mkdir(path.join(rootPath, ENCRYPTED_FOLDER_DIR, ENCRYPTED_TMP_DIR), { recursive: true });

  const dataKey = generateBundleDataKey();
  const createdAt = new Date().toISOString();
  const header = {
    format: "onyx.encrypted-folder",
    version: ENCRYPTED_FOLDER_VERSION,
    createdAt,
    updatedAt: createdAt,
    crypto: {
      dataKey: wrapBundleDataKey(passphrase, dataKey),
    },
    storage: {
      manifest: `${ENCRYPTED_FOLDER_DIR}/${ENCRYPTED_MANIFEST}`,
      objects: `${ENCRYPTED_FOLDER_DIR}/${ENCRYPTED_OBJECTS_DIR}`,
    },
  };
  await atomicWriteJson(headerPath, header);

  let manifest = emptyManifest(options.name ?? path.basename(rootPath), createdAt);
  if (options.seed !== false) {
    manifest = await putManifestDocument(rootPath, dataKey, manifest, "index.md", DEFAULT_INDEX);
    manifest = await putManifestDocument(rootPath, dataKey, manifest, "log.md", DEFAULT_LOG);
  }
  await publishManifest(rootPath, dataKey, manifest);
  return { ok: true, rootPath, manifest: publicManifest(manifest), header: publicHeader(header) };
}

export async function openEncryptedFolder(root, passphrase) {
  const rootPath = path.resolve(root);
  const header = await readHeader(rootPath);
  const dataKey = unwrapBundleDataKey(passphrase, header.crypto?.dataKey);
  const manifest = await readManifest(rootPath, dataKey);
  return { rootPath, dataKey, header, manifest };
}

export async function encryptedFolderInfo(root, passphrase) {
  const session = await openEncryptedFolder(root, passphrase);
  return {
    ok: true,
    rootPath: session.rootPath,
    header: publicHeader(session.header),
    manifest: publicManifest(session.manifest),
  };
}

export async function listEncryptedFolder(root, passphrase) {
  const session = await openEncryptedFolder(root, passphrase);
  return {
    ok: true,
    rootPath: session.rootPath,
    generation: session.manifest.generation,
    documents: Object.keys(session.manifest.documents).sort(),
    assets: Object.keys(session.manifest.assets).sort(),
  };
}

export async function readEncryptedDocument(root, passphrase, relativePath) {
  const session = await openEncryptedFolder(root, passphrase);
  const cleanPath = requireSafeRelativePath(relativePath, { markdownOnly: true });
  const entry = session.manifest.documents[cleanPath];
  if (!entry) throw new OnyxStorageError("not_found", `Encrypted document not found: ${cleanPath}`, { path: cleanPath });
  const object = await readEncryptedObject(session.rootPath, entry.objectId);
  const contents = decryptText(session.dataKey, object.envelope, `document:${cleanPath}:v${entry.version}`);
  if (sha256Hex(contents) !== entry.plaintextHash) throw new OnyxStorageError("tamper", "Document plaintext hash does not match manifest.", { path: cleanPath });
  return { path: cleanPath, contents, hash: entry.plaintextHash, generation: session.manifest.generation, version: entry.version };
}

export async function writeEncryptedDocument(root, passphrase, relativePath, contents, options = {}) {
  const base = await openEncryptedFolder(root, passphrase);
  const cleanPath = requireSafeRelativePath(relativePath, { markdownOnly: true });
  const remote = await readManifest(base.rootPath, base.dataKey);
  const expectedGeneration = options.expectedGeneration ?? base.manifest.generation;
  if (remote.generation !== expectedGeneration) {
    throw new OnyxStorageError("conflict", "Remote encrypted manifest changed before publish.", {
      expectedGeneration,
      actualGeneration: remote.generation,
    });
  }
  const nextVersion = (remote.documents[cleanPath]?.version ?? 0) + 1;
  let nextManifest = { ...remote, documents: { ...remote.documents }, assets: { ...remote.assets } };
  nextManifest = await putManifestDocument(base.rootPath, base.dataKey, nextManifest, cleanPath, String(contents), nextVersion);
  nextManifest.generation = remote.generation + 1;
  nextManifest.updatedAt = new Date().toISOString();
  await publishManifest(base.rootPath, base.dataKey, nextManifest);
  return {
    ok: true,
    path: cleanPath,
    generation: nextManifest.generation,
    document: nextManifest.documents[cleanPath],
  };
}

export async function writeEncryptedAsset(root, passphrase, relativePath, bytes, options = {}) {
  const base = await openEncryptedFolder(root, passphrase);
  const cleanPath = requireSafeRelativePath(relativePath);
  const remote = await readManifest(base.rootPath, base.dataKey);
  const expectedGeneration = options.expectedGeneration ?? base.manifest.generation;
  if (remote.generation !== expectedGeneration) {
    throw new OnyxStorageError("conflict", "Remote encrypted manifest changed before publish.", {
      expectedGeneration,
      actualGeneration: remote.generation,
    });
  }
  const version = (remote.assets[cleanPath]?.version ?? 0) + 1;
  const object = await writeEncryptedObject(base.rootPath, base.dataKey, Buffer.from(bytes), `asset:${cleanPath}:v${version}`);
  const now = new Date().toISOString();
  const nextManifest = {
    ...remote,
    generation: remote.generation + 1,
    updatedAt: now,
    documents: { ...remote.documents },
    assets: {
      ...remote.assets,
      [cleanPath]: {
        kind: "asset",
        objectId: object.objectId,
        plaintextHash: object.plaintextHash,
        ciphertextHash: object.ciphertextHash,
        size: Buffer.from(bytes).length,
        version,
        updatedAt: now,
      },
    },
  };
  await publishManifest(base.rootPath, base.dataKey, nextManifest);
  return { ok: true, path: cleanPath, generation: nextManifest.generation, asset: nextManifest.assets[cleanPath] };
}

export async function readEncryptedAsset(root, passphrase, relativePath) {
  const session = await openEncryptedFolder(root, passphrase);
  const cleanPath = requireSafeRelativePath(relativePath);
  const entry = session.manifest.assets[cleanPath];
  if (!entry) throw new OnyxStorageError("not_found", `Encrypted asset not found: ${cleanPath}`, { path: cleanPath });
  const object = await readEncryptedObject(session.rootPath, entry.objectId);
  const bytes = Buffer.from(decryptText(session.dataKey, object.envelope, `asset:${cleanPath}:v${entry.version}`), "base64");
  if (sha256Hex(bytes) !== entry.plaintextHash) throw new OnyxStorageError("tamper", "Asset plaintext hash does not match manifest.", { path: cleanPath });
  return { path: cleanPath, bytes, hash: entry.plaintextHash, generation: session.manifest.generation, version: entry.version };
}

export async function checkEncryptedFolderConflicts(root, passphrase, expectedGeneration) {
  const session = await openEncryptedFolder(root, passphrase);
  return {
    ok: session.manifest.generation === Number(expectedGeneration),
    expectedGeneration: Number(expectedGeneration),
    actualGeneration: session.manifest.generation,
  };
}

function emptyManifest(bundleName, createdAt) {
  return {
    format: "onyx.encrypted-folder.manifest",
    version: ENCRYPTED_FOLDER_VERSION,
    bundleName,
    createdAt,
    updatedAt: createdAt,
    generation: 1,
    documents: {},
    assets: {},
  };
}

async function putManifestDocument(rootPath, dataKey, manifest, relativePath, contents, version = 1) {
  const cleanPath = requireSafeRelativePath(relativePath, { markdownOnly: true });
  const object = await writeEncryptedObject(rootPath, dataKey, Buffer.from(String(contents), "utf8"), `document:${cleanPath}:v${version}`);
  const now = new Date().toISOString();
  return {
    ...manifest,
    updatedAt: now,
    documents: {
      ...manifest.documents,
      [cleanPath]: {
        kind: "document",
        objectId: object.objectId,
        plaintextHash: object.plaintextHash,
        ciphertextHash: object.ciphertextHash,
        size: Buffer.byteLength(String(contents), "utf8"),
        version,
        updatedAt: now,
      },
    },
  };
}

async function writeEncryptedObject(rootPath, dataKey, plaintext, aad) {
  const plaintextBuffer = Buffer.from(plaintext);
  const envelope = encryptText(dataKey, aad.startsWith("asset:") ? plaintextBuffer.toString("base64") : plaintextBuffer.toString("utf8"), aad);
  const objectPayload = {
    format: "onyx.encrypted-object",
    version: ENCRYPTED_FOLDER_VERSION,
    envelope,
  };
  const serialized = Buffer.from(JSON.stringify(objectPayload, null, 2), "utf8");
  const ciphertextHash = sha256Hex(serialized);
  const objectId = `${ciphertextHash}.owblob`;
  await atomicWriteFile(path.join(rootPath, ENCRYPTED_FOLDER_DIR, ENCRYPTED_OBJECTS_DIR, objectId), serialized);
  return { objectId, plaintextHash: sha256Hex(plaintextBuffer), ciphertextHash };
}

async function readEncryptedObject(rootPath, objectId) {
  const objectPath = path.join(rootPath, ENCRYPTED_FOLDER_DIR, ENCRYPTED_OBJECTS_DIR, objectId);
  if (!(await pathExists(objectPath))) throw new OnyxStorageError("missing_object", `Encrypted object is missing: ${objectId}`, { objectId });
  try {
    return JSON.parse(await fs.readFile(objectPath, "utf8"));
  } catch (error) {
    throw new OnyxStorageError("decode_failed", "Encrypted object could not be decoded.", { objectId, cause: String(error) });
  }
}

async function readHeader(rootPath) {
  const headerPath = path.join(rootPath, ENCRYPTED_FOLDER_HEADER);
  if (!(await pathExists(headerPath))) throw new OnyxStorageError("not_found", "Encrypted bundle header not found.", { root: rootPath });
  const header = JSON.parse(await fs.readFile(headerPath, "utf8"));
  if (header.format !== "onyx.encrypted-folder" || header.version !== ENCRYPTED_FOLDER_VERSION) {
    throw new OnyxStorageError("unsupported_format", "Unsupported encrypted folder format.", { version: header.version });
  }
  return header;
}

async function readManifest(rootPath, dataKey) {
  const manifestPath = path.join(rootPath, ENCRYPTED_FOLDER_DIR, ENCRYPTED_MANIFEST);
  if (!(await pathExists(manifestPath))) throw new OnyxStorageError("not_found", "Encrypted manifest not found.", { root: rootPath });
  const envelope = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  return decryptJson(dataKey, envelope, "onyxwriter:encrypted-folder-manifest:v1");
}

async function publishManifest(rootPath, dataKey, manifest) {
  const manifestPath = path.join(rootPath, ENCRYPTED_FOLDER_DIR, ENCRYPTED_MANIFEST);
  const envelope = encryptJson(dataKey, manifest, "onyxwriter:encrypted-folder-manifest:v1");
  await atomicWriteJson(manifestPath, envelope);
}

async function atomicWriteJson(targetPath, value) {
  await atomicWriteFile(targetPath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"));
}

async function atomicWriteFile(targetPath, bytes) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmp = path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tmp, bytes);
  await fs.rename(tmp, targetPath);
}

function publicHeader(header) {
  return {
    format: header.format,
    version: header.version,
    createdAt: header.createdAt,
    updatedAt: header.updatedAt,
    kdf: header.crypto?.dataKey?.kdf ? { ...header.crypto.dataKey.kdf, salt: "<redacted>" } : undefined,
    storage: header.storage,
  };
}

function publicManifest(manifest) {
  return {
    format: manifest.format,
    version: manifest.version,
    bundleName: manifest.bundleName,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
    generation: manifest.generation,
    documentCount: Object.keys(manifest.documents).length,
    assetCount: Object.keys(manifest.assets).length,
  };
}

function requireSafeRelativePath(relativePath, options = {}) {
  const clean = String(relativePath ?? "").replace(/\\/g, "/").split("/").filter(Boolean).join("/");
  if (!clean || clean.startsWith("/") || clean.includes("../") || clean === ".." || clean.includes("\0")) {
    throw new OnyxStorageError("unsafe_path", "Path must be bundle-relative and cannot traverse outside storage.", { path: relativePath });
  }
  if (options.markdownOnly && !clean.toLowerCase().endsWith(".md")) {
    throw new OnyxStorageError("invalid_path", "Encrypted document paths must end in .md.", { path: clean });
  }
  return clean;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
