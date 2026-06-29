# Encrypted Bundles

Date: 2026-06-29  
Status: ROU-059 experimental desktop and CLI implementation

## Threat Model

Encrypted storage protects document contents and asset bytes when a bundle is placed in a third-party folder, mounted remote path, or future dumb blob host. Encryption and decryption happen locally. Remote providers should only see fixed control filenames, encrypted manifests, encrypted object blobs, sealed bundle files, approximate sizes, object counts, and update timing.

The first implementation does not send key material, plaintext Markdown, plaintext assets, or decrypted manifests to remote storage. Key material is derived locally from the operator passphrase, and the bundle data key is wrapped with scrypt plus AES-256-GCM.

Plaintext can still exist in local process memory while a bundle is unlocked. Onyx Writer cannot protect against a compromised local machine, malicious clipboard tooling, screen capture, or a user placing plaintext exports beside encrypted storage.

## Storage Modes

Encrypted folder mode is the daily-driver mode. It creates a remote-safe folder with:

- `onyx-encrypted-folder.json`: plaintext format header and wrapped bundle key metadata.
- `.onyx-encrypted/manifest.enc.json`: encrypted manifest containing document paths, asset paths, hashes, versions, and tree metadata.
- `.onyx-encrypted/objects/*.owblob`: encrypted content objects.
- `.onyx-encrypted/tmp/`: temporary write area for publish operations.

Document paths and filenames are encrypted inside the manifest in this first implementation. Object filenames are ciphertext hashes, not original names. The provider can still infer object count, approximate size, and update cadence.

Sealed bundle mode is the higher-privacy/archive mode. It stores the whole bundle in one opaque `*.onyxsealed` file. It leaks less structure but has worse performance and coarser conflict behavior because every save rewrites the sealed archive.

## Remote Provider Boundary

Remote storage is intentionally dumb. A provider may store blobs, expose a current version pointer, support compare-and-swap, and optionally expose advisory leases. It does not validate OKF, repair links, decrypt files, manage keys, understand documents, or merge changes.

Correctness is owned by the desktop/CLI side. Writes compare the current encrypted manifest generation before publishing. Stale generations produce conflicts instead of silent overwrites. Advisory locks can reduce collisions, but cleanup failure must not be required for correctness.

## Non-Goals

- No custom cipher or homemade authentication scheme.
- No server-side plaintext.
- No hosted Onyx accounts.
- No live collaboration.
- No automatic key recovery.
- No remote OKF validation or link repair.
- No guarantee that provider metadata is hidden.

## Key Loss

If the passphrase or future key material is lost, the encrypted bundle is unrecoverable. This is an intentional consequence of local-only encryption.
