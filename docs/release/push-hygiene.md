# Push Hygiene

Onyx Writer is developed with local planning and command-deck tooling that should not be published with the product source tree. The GitHub repository should contain the app, tests, public docs, package manifests, Tauri project files, and runtime assets intended to ship.

## Public File Set

Include:

- `src/`
- `src-tauri/`, except generated targets
- `public/`
- `docs/` public architecture and release notes
- `.github/` public issue and pull request templates
- `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `SUPPORT.md`, `SECURITY.md`, `CONTRIBUTING.md`
- `package.json`, `package-lock.json`, TypeScript/Vite/Vitest config

Exclude:

- `.amphion/` and Command Deck databases
- `.agent/`, `.agents/`, and `AGENTS.md`
- `.plandocs/`
- `.vscode/mcp.json`
- `ops/amphion.json`
- `node_modules/`
- `dist/`
- `src-tauri/target/`
- local `.env*`, credentials, logs, caches, and machine-specific files
- updater private keys, updater passwords, and local signing files such as `*.key`

## Why Not Push Local `main` Directly

The local development repository has tracked internal planning/runtime files in prior commits. Deleting those files from the current branch would not remove them from Git history. A direct push of local `main` would therefore publish internal history.

The first GitHub publication must use a clean publication branch or export repository with a fresh root commit containing only the public file set.

## First Push Workflow

1. Verify local development branch is clean except expected local-only ignored files.
2. Build a clean export from the current working tree, excluding local-only paths listed above.
3. Initialize a fresh Git repository in the export directory.
4. Commit the sanitized file set as the first public commit.
5. Push the export branch to `git@github.com:activetwist/OnyxWriter.git` while the repository remains private.
6. Inspect the pushed branch on GitHub and confirm excluded files are absent.

## Continuing Development

Continue feature work in the local development repository. When refreshing the private GitHub branch, rebuild the clean export from the current source rather than pushing local internal history.

If the public repository ever becomes the primary development repository, migrate local planning tooling into a separate private repo or keep it outside Git entirely.

## Release Signing Hygiene

The Tauri updater public key is safe to commit in `src-tauri/tauri.conf.json`. The private updater key is not.

Keep updater signing material in local secure storage and GitHub Actions secrets only:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

Before pushing a release-prep change, verify that no private key material or local signer output is staged:

```sh
git diff --cached --name-only | rg '(\\.key$|\\.pem$|\\.p12$|\\.mobileprovision$)'
git diff --cached | rg 'TAURI_SIGNING_PRIVATE_KEY|BEGIN .*PRIVATE|untrusted comment: minisign secret key'
```

Both commands should produce no output.

## Verification Checklist

Before each publication push:

```sh
npm run typecheck
npm run test
npm run build
npm run license:check
npm audit --audit-level=high
```

Then inspect the sanitized export:

```sh
git ls-files | rg '(^\\.amphion/|^\\.agent/|^\\.agents/|^AGENTS\\.md$|^\\.plandocs/|^\\.vscode/mcp\\.json$|^ops/amphion\\.json$|^dist/|^node_modules/|^src-tauri/target/)'
```

The command should produce no output.
