# Encrypted Storage Release Readiness

ROU-058 added experimental encrypted-storage primitives and command-line workflows. ROU-059 brings the encrypted folder path into the desktop alpha release.

## Status

- Encrypted folder mode: experimental, CLI-ready and desktop-open/edit/save ready for copied test bundles.
- Sealed bundle mode: prototype, suitable for archive experiments and tests.
- Desktop settings: can select a folder, create an encrypted bundle, unlock an encrypted bundle, and mount decrypted documents into the editor session.
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

- Desktop encrypted bundle structure mutations are deferred. Create/rename/move/delete remain normal-bundle only in this alpha.
- No OS keychain integration yet.
- Passphrases are session-only and are not stored by Onyx Writer.
- No provider-specific adapters.
- No automatic conflict merge.
- Sealed bundle mode remains CLI/prototype only.
