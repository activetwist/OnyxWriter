// @ts-nocheck
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OnyxCryptoError, decryptText, encryptText, generateBundleDataKey } from "../../src/lib/crypto/envelope.mjs";
import {
  ENCRYPTED_FOLDER_DIR,
  ENCRYPTED_OBJECTS_DIR,
  encryptedFolderInfo,
  initializeEncryptedFolder,
  listEncryptedFolder,
  openEncryptedFolder,
  readEncryptedDocument,
  writeEncryptedDocument,
} from "../../src/lib/storage/encryptedFolder.mjs";
import { openSealedBundle, readSealedDocument, sealDirectoryBundle, updateSealedDocument } from "../../src/lib/storage/sealedBundle.mjs";

describe("crypto envelopes", () => {
  it("encrypts and decrypts while rejecting tampered payloads and wrong keys", () => {
    const key = generateBundleDataKey();
    const envelope = encryptText(key, "secret markdown", "aad");
    expect(decryptText(key, envelope, "aad")).toBe("secret markdown");
    const tampered = { ...envelope, ciphertext: envelope.ciphertext.replace(/.$/, envelope.ciphertext.endsWith("A") ? "B" : "A") };
    expect(() => decryptText(key, tampered, "aad")).toThrow(OnyxCryptoError);
    expect(() => decryptText(generateBundleDataKey(), envelope, "aad")).toThrow(OnyxCryptoError);
  });

  it("uses unique nonces for repeated encryption", () => {
    const key = generateBundleDataKey();
    const one = encryptText(key, "same", "aad");
    const two = encryptText(key, "same", "aad");
    expect(one.nonce).not.toBe(two.nonce);
    expect(one.ciphertext).not.toBe(two.ciphertext);
  });
});

describe("encrypted folder storage", () => {
  it("initializes, saves, reopens, and lists encrypted documents without plaintext markdown files", async () => {
    await withTempDir(async (root) => {
      await initializeEncryptedFolder(root, "correct horse battery staple", { name: "Private Bundle" });
      const info = await encryptedFolderInfo(root, "correct horse battery staple");
      expect(info.manifest.bundleName).toBe("Private Bundle");
      expect(info.manifest.documentCount).toBe(2);

      const write = await writeEncryptedDocument(root, "correct horse battery staple", "notes/alpha.md", "---\ntype: note\ntitle: Alpha\n---\n\n# Alpha\n");
      expect(write.generation).toBeGreaterThan(1);

      const reopened = await readEncryptedDocument(root, "correct horse battery staple", "notes/alpha.md");
      expect(reopened.contents).toContain("# Alpha");
      const listing = await listEncryptedFolder(root, "correct horse battery staple");
      expect(listing.documents).toContain("notes/alpha.md");

      await expect(readFile(path.join(root, "notes", "alpha.md"), "utf8")).rejects.toThrow();
      const objectFiles = await readObjectFiles(root);
      expect(objectFiles.length).toBeGreaterThan(0);
      const concatenatedObjects = (await Promise.all(objectFiles.map((file) => readFile(file, "utf8")))).join("\n");
      expect(concatenatedObjects).not.toContain("# Alpha");
      expect(concatenatedObjects).not.toContain("notes/alpha.md");
    });
  });

  it("rejects wrong passphrases and missing objects", async () => {
    await withTempDir(async (root) => {
      await initializeEncryptedFolder(root, "open sesame");
      await expect(openEncryptedFolder(root, "wrong")).rejects.toThrow();
      const write = await writeEncryptedDocument(root, "open sesame", "notes/missing.md", "---\ntype: note\n---\n\nmissing");
      await rm(path.join(root, ENCRYPTED_FOLDER_DIR, ENCRYPTED_OBJECTS_DIR, write.document.objectId));
      await expect(readEncryptedDocument(root, "open sesame", "notes/missing.md")).rejects.toMatchObject({ code: "missing_object" });
    });
  });

  it("prevents stale writes from silently overwriting newer remote state", async () => {
    await withTempDir(async (root) => {
      await initializeEncryptedFolder(root, "sync-key");
      const base = await encryptedFolderInfo(root, "sync-key");
      await writeEncryptedDocument(root, "sync-key", "notes/current.md", "---\ntype: note\n---\n\ncurrent", { expectedGeneration: base.manifest.generation });
      await expect(
        writeEncryptedDocument(root, "sync-key", "notes/stale.md", "---\ntype: note\n---\n\nstale", { expectedGeneration: base.manifest.generation }),
      ).rejects.toMatchObject({ code: "conflict" });
    });
  });
});

describe("sealed bundle prototype", () => {
  it("seals, opens, reads, updates, and rejects wrong keys", async () => {
    await withTempDir(async (root) => {
      const source = path.join(root, "source");
      await mkdir(source, { recursive: true });
      await writeFile(path.join(source, "index.md"), "---\ntype: Index\n---\n\n# Source\n");
      const target = path.join(root, "bundle.onyxsealed");
      await sealDirectoryBundle(source, target, "sealed-key", { name: "Sealed" });
      const opened = await openSealedBundle(target, "sealed-key");
      expect(opened.archive.bundleName).toBe("Sealed");
      expect((await readSealedDocument(target, "sealed-key", "index.md")).contents).toContain("# Source");
      await updateSealedDocument(target, "sealed-key", "notes/new.md", "---\ntype: note\n---\n\n# New\n");
      expect((await readSealedDocument(target, "sealed-key", "notes/new.md")).contents).toContain("# New");
      await expect(openSealedBundle(target, "wrong")).rejects.toThrow();
    });
  });
});

async function withTempDir(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), "onyx-encrypted-"));
  try {
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function readObjectFiles(root) {
  const dir = path.join(root, ENCRYPTED_FOLDER_DIR, ENCRYPTED_OBJECTS_DIR);
  const names = await readdir(dir);
  return names.map((name) => path.join(dir, name));
}
