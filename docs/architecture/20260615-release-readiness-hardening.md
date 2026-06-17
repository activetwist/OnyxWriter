# Release Readiness Hardening

ROU-026 adds release-path hardening around bundle mutations, OKF confidence, and desktop packaging.

## Bundle Mutations

Bundle rename, move, and delete operations now stage through a mutation plan before file changes are applied. Plans identify affected paths, moved Markdown documents, link-repair scope, and destructive operations so the UI can show a confidence dialog.

Drag/drop is constrained to folder drop targets and the bundle root. Reserved system Markdown files remain non-draggable and hidden by default.

After successful mutations, Onyx Writer reloads the tree, refreshes the deterministic managed index block, reloads graph documents, repairs Markdown document links, and remaps the selected document where possible.

## OKF Confidence

Validation results now separate errors, warnings, and editor-confidence notices. Broken document links are grouped separately from frontmatter and other warnings. Unsupported or raw-mode-preferred Markdown, including Mermaid and fenced code, appears as informational editor-confidence guidance instead of blocking save.

The reference fixture corpus under `tests/fixtures/okf-reference` exercises deterministic root index behavior, `log.md`, table/dataset/query concepts, tables, images, Mermaid, SQL fences, internal links, and serializer round trips.

## Desktop Boundary

Tauri product metadata now uses `Onyx Writer`, with a generated cross-platform icon set under `src-tauri/icons`. The desktop shell remains local-first:

- Bundle content stays in the selected bundle folder.
- Bundle images are copied into bundle-local `assets/images/`.
- JSONM imports and active design-system settings live in app data.
- Browser preview mode uses `localStorage` for app settings.

Signing and notarization are deferred to release-candidate operations.

## Release Polish

The editor and bundle graph are loaded lazily so startup does not pull all editing and graph dependencies into the first render path. The release checklist in `docs/release/manual-qa.md` defines the manual desktop pass required beyond MAMP/browser verification.
