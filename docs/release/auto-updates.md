# Auto Updates

Onyx Writer uses the Tauri updater plugin for desktop auto-update checks. The update channel is GitHub Releases; no custom update server is required for the first public release path.

## Release Channel

The desktop app checks:

```text
https://github.com/activetwist/OnyxWriter/releases/latest/download/latest.json
```

That file is expected to describe the latest signed updater artifact for the current platform. GitHub Release installer assets and updater payload assets are related but not identical.

Manual install assets:

- macOS: `.dmg`
- Linux: `.deb` and `.rpm`

Updater payload assets:

- macOS: signed `.app.tar.gz` plus signature metadata
- Linux: AppImage-oriented updater assets when AppImage packaging is enabled and reliable

## Important Version Constraint

`v0.1.0-alpha` cannot update itself because it was built before updater code, updater permissions, endpoint config, and update signing were added.

The first updater-enabled release must be installed manually. After that, later releases can be discovered and installed from inside Onyx Writer.

## Signing Keys

Tauri updater artifacts must be signed. Signature verification is part of the updater trust model and should not be disabled.

Local alpha key generated for this cycle:

```text
Private key path: ~/.onyxwriter/keys/onyxwriter-updater.key
Public key path:  ~/.onyxwriter/keys/onyxwriter-updater.key.pub
```

Only the public key is committed in `src-tauri/tauri.conf.json`.

The local alpha key was generated without a password because execution was non-interactive. Before relying on this channel as a durable public update channel, prefer regenerating a password-protected key and updating the Tauri public key before the updater-enabled release ships.

Generation command:

```sh
npx tauri signer generate --write-keys "$HOME/.onyxwriter/keys/onyxwriter-updater.key"
```

Signing environment variables:

```sh
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.onyxwriter/keys/onyxwriter-updater.key")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
```

GitHub Actions secrets:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

The private key and password must never be committed, pasted into release notes, or stored in docs.

## GitHub Actions

`.github/workflows/release.yml` is tag-triggered and uses standard GitHub-hosted runners. Standard runners are currently free for public repositories, but the workflow still avoids unnecessary cost and storage by:

- running package builds only on tags or manual dispatch;
- creating draft releases for review;
- avoiding larger runners;
- relying on release assets instead of long-lived intermediate artifacts.

The release workflow builds:

- macOS Apple Silicon via `--target aarch64-apple-darwin`;
- Linux DEB/RPM via `--bundles deb,rpm`.

The workflow uses `tauri-apps/tauri-action` with `includeUpdaterJson: true` so the release can publish updater metadata and signatures alongside installer assets.

Linux in-app updater support is deferred until AppImage packaging is reliable. DEB/RPM remain manual update assets.

## Manual Release Procedure

1. Confirm the working source has passed verification.
2. Confirm GitHub repository secrets exist:
   - `TAURI_SIGNING_PRIVATE_KEY`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
3. Tag the updater-enabled release:

```sh
git tag v0.1.1-alpha
git push origin v0.1.1-alpha
```

4. Wait for GitHub Actions to produce a draft release.
5. Inspect the draft release assets.
6. Confirm macOS includes both the manual DMG and updater archive/signature metadata.
7. Confirm Linux includes DEB/RPM manual assets.
8. Publish the release when assets and notes are correct.

## Test Update Flow

To prove auto-update behavior, install one updater-enabled version, then publish a later signed release. From the installed earlier version:

1. Open Settings.
2. Open Updates.
3. Click Check for Updates.
4. Confirm the later version appears.
5. Install the update.
6. Restart Onyx Writer.
7. Confirm the application reports the new version.

## Failure States

The app should distinguish:

- no update available;
- updater unavailable outside the desktop runtime;
- update available;
- downloading/installing;
- installed, restart required;
- network/release-channel failure;
- signature verification failure;
- unknown updater failure.

## Linux AppImage Decision

Tauri's in-app Linux updater path is AppImage-oriented. The current public alpha produced DEB/RPM packages, while AppImage bundling timed out during the JARVIS verification pass. For the next release, Linux users can still install manual DEB/RPM packages. In-app Linux updates should be enabled only after AppImage packaging is verified.
