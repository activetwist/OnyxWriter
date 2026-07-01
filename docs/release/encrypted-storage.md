# Encrypted Storage Release Readiness

ROU-058 added experimental encrypted-storage primitives and command-line workflows. ROU-059 brought encrypted folder open/edit/save into the desktop alpha release. ROU-061 renames the desktop UX to Protected Bundles and adds passphrase-gated normal open, explicit lock, and protected-copy creation.

## Status

- Protected folder mode: experimental, CLI-ready and desktop-open/edit/save ready for copied test bundles.
- Sealed bundle mode: prototype, suitable for archive experiments and tests.
- Desktop settings: can select a folder, create a protected bundle, unlock a protected bundle, lock the active protected bundle, and create a protected copy from the active standard bundle.
- Normal Open Bundle detects protected folders and prompts for the passphrase before mounting decrypted documents.
- Hosted remote storage: deferred.

## Verification

Required checks for this milestone:

- `npx vitest run tests/storage/encryptedStorage.test.ts`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run tauri:check`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## Known Limits

- Desktop protected bundle structure mutations are deferred. Create/rename/move/delete remain normal-bundle only in this alpha.
- Protected-copy creation currently copies Markdown documents. Asset encryption is deferred.
- No OS keychain integration yet.
- Passphrases are session-only and are not stored by Onyx Writer.
- No provider-specific adapters.
- No automatic conflict merge.
- Sealed bundle mode remains CLI/prototype only.
