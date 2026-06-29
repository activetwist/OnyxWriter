#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  bundleInfo,
  checkLinks,
  createDocument,
  deletePath,
  graphSummary,
  importAsset,
  listBundleTree,
  movePath,
  OnyxCoreError,
  readDocument,
  refreshManagedIndexes,
  renamePath,
  updateDocument,
  validateBundle,
} from "../src/lib/onyx-core/nodeRuntime.mjs";
import {
  checkEncryptedFolderConflicts,
  encryptedFolderInfo,
  initializeEncryptedFolder,
  listEncryptedFolder,
  readEncryptedDocument,
  writeEncryptedDocument,
} from "../src/lib/storage/encryptedFolder.mjs";
import { openSealedBundle, readSealedDocument, sealDirectoryBundle, updateSealedDocument } from "../src/lib/storage/sealedBundle.mjs";

const args = parseArgs(process.argv.slice(2));

try {
  const result = await dispatch(args);
  writeResult(result, args.flags.json);
} catch (error) {
  writeError(error, args.flags.json);
  process.exit(exitCodeFor(error));
}

async function dispatch({ positionals, flags }) {
  const [group, action] = positionals;
  if (!group || flags.help || group === "help") return help();
  if (group === "encrypted" && action === "init") {
    return initializeEncryptedFolder(requireRoot(flags), requirePassphrase(flags), {
      name: flags.name,
      seed: flags.seed === undefined ? true : flags.seed !== "false",
    });
  }
  if (group === "encrypted" && action === "info") return encryptedFolderInfo(requireRoot(flags), requirePassphrase(flags));
  if (group === "encrypted" && action === "list") return listEncryptedFolder(requireRoot(flags), requirePassphrase(flags));
  if (group === "encrypted" && action === "read") return readEncryptedDocument(requireRoot(flags), requirePassphrase(flags), requireFlag(flags, "path"));
  if (group === "encrypted" && action === "write") {
    return writeEncryptedDocument(requireRoot(flags), requirePassphrase(flags), requireFlag(flags, "path"), await contentFromFlags(flags, true), {
      expectedGeneration: flags["expected-generation"] === undefined ? undefined : Number(flags["expected-generation"]),
    });
  }
  if (group === "encrypted" && action === "conflicts") {
    return checkEncryptedFolderConflicts(requireRoot(flags), requirePassphrase(flags), requireFlag(flags, "expected-generation"));
  }
  if (group === "sealed" && action === "create") {
    return sealDirectoryBundle(requireFlag(flags, "source"), requireFlag(flags, "target"), requirePassphrase(flags), { name: flags.name });
  }
  if (group === "sealed" && action === "info") {
    const sealed = await openSealedBundle(requireFlag(flags, "target"), requirePassphrase(flags));
    return {
      ok: true,
      targetFile: sealed.targetFile,
      header: sealed.header,
      bundleName: sealed.archive.bundleName,
      fileCount: Object.keys(sealed.archive.files).length,
      updatedAt: sealed.archive.updatedAt,
    };
  }
  if (group === "sealed" && action === "read") return readSealedDocument(requireFlag(flags, "target"), requirePassphrase(flags), requireFlag(flags, "path"));
  if (group === "sealed" && action === "write") {
    return updateSealedDocument(requireFlag(flags, "target"), requirePassphrase(flags), requireFlag(flags, "path"), await contentFromFlags(flags, true));
  }
  const root = requireRoot(flags);
  if (group === "bundle" && action === "info") return bundleInfo(root);
  if (group === "bundle" && action === "tree") return listBundleTree(root, { includeOtherFiles: Boolean(flags.all) });
  if (group === "bundle" && action === "validate") return validateBundle(root);
  if (group === "doc" && action === "read") return readDocument(root, requireFlag(flags, "path"));
  if (group === "doc" && action === "create") {
    return createDocument(root, requireFlag(flags, "path"), {
      title: flags.title,
      type: flags.type,
      contents: await contentFromFlags(flags),
      caller: "cli",
    });
  }
  if (group === "doc" && action === "update") {
    return updateDocument(root, requireFlag(flags, "path"), await contentFromFlags(flags, true), {
      expectedHash: flags["expected-hash"],
      expectedMtimeMs: flags["expected-mtime-ms"] === undefined ? undefined : Number(flags["expected-mtime-ms"]),
      caller: "cli",
    });
  }
  if (group === "doc" && action === "move") return movePath(root, requireFlag(flags, "from"), requireFlag(flags, "to"), { caller: "cli" });
  if (group === "doc" && action === "rename") return renamePath(root, requireFlag(flags, "path"), requireFlag(flags, "name"), { caller: "cli" });
  if (group === "doc" && action === "delete") return deletePath(root, requireFlag(flags, "path"), { caller: "cli" });
  if (group === "index" && action === "refresh") return refreshManagedIndexes(root, { caller: "cli" });
  if (group === "links" && action === "check") return checkLinks(root);
  if (group === "graph" && action === "export") return graphSummary(root);
  if (group === "asset" && action === "import") return importAsset(root, requireFlag(flags, "source"), { caller: "cli" });
  throw new OnyxCoreError("usage", `Unknown command: ${[group, action].filter(Boolean).join(" ")}`);
}

function parseArgs(argv) {
  const flags = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }
    const [rawKey, inlineValue] = value.slice(2).split("=");
    const key = rawKey.trim();
    if (!key) continue;
    if (inlineValue !== undefined) {
      flags[key] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { positionals, flags };
}

function requireRoot(flags) {
  return requireFlag(flags, "root");
}

function requirePassphrase(flags) {
  return requireFlag(flags, "passphrase");
}

function requireFlag(flags, key) {
  const value = flags[key];
  if (value === undefined || value === true || value === "") throw new OnyxCoreError("usage", `Missing required --${key}.`);
  return String(value);
}

async function contentFromFlags(flags, required = false) {
  if (flags["content-file"]) return readFile(String(flags["content-file"]), "utf8");
  if (flags.content !== undefined && flags.content !== true) return String(flags.content);
  if (required) throw new OnyxCoreError("usage", "Provide --content or --content-file.");
  return "";
}

function writeResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (typeof result === "string") {
    process.stdout.write(`${result}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function writeError(error, json) {
  const payload = {
    ok: false,
    code: error instanceof OnyxCoreError ? error.code : "error",
    message: error instanceof Error ? error.message : String(error),
    details: error instanceof OnyxCoreError ? error.details : undefined,
  };
  if (json) process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stderr.write(`${payload.code}: ${payload.message}\n`);
}

function exitCodeFor(error) {
  if (!(error instanceof OnyxCoreError)) return 1;
  if (error.code === "conflict") return 3;
  if (error.code === "usage") return 64;
  if (error.code === "unsafe_path" || error.code === "reserved") return 65;
  return 1;
}

function help() {
  return `Onyx Writer CLI

Usage:
  onyx bundle info --root .plandocs [--json]
  onyx bundle tree --root .plandocs [--json]
  onyx bundle validate --root .plandocs [--json]
  onyx doc create --root .plandocs --path notes/example.md --type note --title "Example"
  onyx doc read --root .plandocs --path notes/example.md [--json]
  onyx doc update --root .plandocs --path notes/example.md --content-file update.md [--expected-hash HASH]
  onyx doc move --root .plandocs --from notes/example.md --to archive/example.md
  onyx doc rename --root .plandocs --path notes/example.md --name renamed.md
  onyx doc delete --root .plandocs --path notes/example.md
  onyx index refresh --root .plandocs
  onyx links check --root .plandocs [--json]
  onyx graph export --root .plandocs [--json]
  onyx asset import --root .plandocs --source ./diagram.svg

Encrypted folder storage:
  onyx encrypted init --root ./RemoteEncrypted --passphrase "..." --name "My Bundle"
  onyx encrypted info --root ./RemoteEncrypted --passphrase "..." [--json]
  onyx encrypted list --root ./RemoteEncrypted --passphrase "..." [--json]
  onyx encrypted read --root ./RemoteEncrypted --passphrase "..." --path index.md [--json]
  onyx encrypted write --root ./RemoteEncrypted --passphrase "..." --path notes/example.md --content-file update.md [--expected-generation N]
  onyx encrypted conflicts --root ./RemoteEncrypted --passphrase "..." --expected-generation N

Sealed bundle prototype:
  onyx sealed create --source .plandocs --target bundle.onyxsealed --passphrase "..."
  onyx sealed info --target bundle.onyxsealed --passphrase "..."
  onyx sealed read --target bundle.onyxsealed --passphrase "..." --path index.md
  onyx sealed write --target bundle.onyxsealed --passphrase "..." --path notes/example.md --content-file update.md
`;
}
