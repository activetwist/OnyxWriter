# Encrypted Bundles Guide

Encrypted storage is experimental in the `v0.1.10-alpha` and later alpha line. Use it on copied bundles until the feature graduates from alpha.

## What It Does

Onyx Writer encrypts bundle content locally, then writes encrypted data to a folder or file you control. This works with local paths, mounted network folders, iCloud, Dropbox, Google Drive, OneDrive, Internxt, and similar providers.

Providers do not receive plaintext documents, plaintext assets, plaintext keys, or decrypted manifests. Providers can still see fixed control filenames, encrypted blob count, approximate size, and update timing.

## Encrypted Folder Mode

Create an encrypted folder:

```bash
onyx encrypted init --root ./RemoteEncrypted --passphrase "keep-this-secret" --name "Private Bundle"
```

Inspect it:

```bash
onyx encrypted info --root ./RemoteEncrypted --passphrase "keep-this-secret" --json
```

List decrypted document paths:

```bash
onyx encrypted list --root ./RemoteEncrypted --passphrase "keep-this-secret" --json
```

Write with stale-generation protection:

```bash
onyx encrypted write \
  --root ./RemoteEncrypted \
  --passphrase "keep-this-secret" \
  --path notes/example.md \
  --content-file update.md \
  --expected-generation 3
```

If the remote manifest generation changed, the write fails with a conflict instead of overwriting.

## Sealed Bundle Prototype

Create a sealed bundle file:

```bash
onyx sealed create --source .plandocs --target bundle.onyxsealed --passphrase "keep-this-secret"
```

Inspect it:

```bash
onyx sealed info --target bundle.onyxsealed --passphrase "keep-this-secret"
```

Read a document:

```bash
onyx sealed read --target bundle.onyxsealed --passphrase "keep-this-secret" --path index.md
```

Sealed mode hides more structure but is less efficient for large bundles because the whole archive is rewritten.

## Provider Responsibilities

A future dumb host should provide only blob/object storage, version pointers, compare-and-swap, and optional advisory leases. It should not decrypt, validate OKF, repair links, manage keys, or merge documents.

## Limitations

- Key loss is permanent data loss.
- Metadata leakage is reduced, not eliminated.
- Provider atomicity varies.
- Conflicts are detected, not automatically merged.
- Desktop UI can create, unlock, open, edit, save, and refresh encrypted folder documents. Structure mutations are deferred for encrypted bundles.
- No Onyx-hosted remote service exists in this milestone.
