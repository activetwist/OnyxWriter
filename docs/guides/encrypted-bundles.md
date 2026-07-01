# Protected Bundles Guide

Protected bundle storage is experimental in the `v0.1.13-alpha` line. Keep recoverable backups until the feature graduates from alpha.

## What It Does

Onyx Writer encrypts bundle content locally, then writes encrypted data to a folder or file you control. This works with local paths, mounted network folders, iCloud, Dropbox, Google Drive, OneDrive, Internxt, and similar providers.

Providers do not receive plaintext documents, plaintext assets, plaintext keys, or decrypted manifests. Providers can still see fixed control filenames, encrypted blob count, approximate size, and update timing.

## Desktop Protected Folder Mode

The desktop app can:

- Create a new protected bundle from Settings.
- Detect a protected bundle when you use Open Bundle.
- Prompt for the passphrase before documents, tabs, search, validation, or graph data are mounted.
- Lock a protected bundle from Settings, clearing session passphrase state and decrypted document state.
- Create a protected copy of the current standard bundle into an empty destination folder.
- Create, rename, move, and delete protected Markdown documents and protected folders after the bundle is unlocked.

Existing protected bundles are opened from the normal Open Bundle flow. Settings creates new protected bundles, creates protected copies, and locks the active protected bundle.

The protected-copy workflow leaves the original standard bundle unchanged for alpha safety. Verify the protected copy before archiving or deleting the source bundle.

## CLI Encrypted Folder Mode

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
- Desktop UI can create, open, edit, save, refresh, rename, move, and delete protected documents and folders after unlock.
- Protected-copy creation currently copies Markdown documents into the protected folder. Asset encryption is deferred.
- No Onyx-hosted remote service exists in this milestone.
