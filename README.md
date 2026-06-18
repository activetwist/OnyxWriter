# Onyx Writer

Onyx Writer is a local-first editor for Open Knowledge Format bundles. A bundle is a folder-backed OKF document space that Onyx Writer indexes and manages as one unit. The app uses Tauri for the desktop shell, flat files for document storage, Tiptap for visual editing, and CodeMirror for raw OKF editing.

The app also includes a JSONM design-system runtime. JSONM definitions are validated and compiled into constrained CSS variables for the app shell, editor, validation panel, and document preview surface. Bundled archetypes ship with the app, while imported JSONM files are stored as app configuration outside OKF bundles.

## Status

Onyx Writer `0.1.2-alpha` is the current public alpha release. It is useful for testing local OKF bundle editing now, but it should still be treated as early software. Keep backups of important bundles and expect the OKF support surface to evolve as the format and editor mature.

## Features

- Visual and raw editing modes for OKF Markdown documents.
- Flat-file bundle storage with no document database.
- Multi-document tabs, autosave, validation feedback, and document tree management.
- Local Mermaid rendering with zoom, pan, fit, and reset controls.
- Interactive bundle graph with folders, documents, internal links, broken links, local physics, hover focus, and node selection.
- JSONM-driven app theming with bundled design-system archetypes and local imports.
- Developer-project safeguards for OKF bundles nested inside source repositories.

## Downloads

The `v0.1.2-alpha` GitHub release includes:

- macOS Apple Silicon DMG
- Linux DEB package
- Linux RPM package
- SHA-256 checksums

The macOS app is not signed or notarized yet, so macOS may show a warning on first launch. Windows and AppImage builds are not part of this alpha.

`v0.1.1-alpha` was the first updater-enabled release. `v0.1.2-alpha` is intended to be discoverable from that build through the signed macOS updater path. Linux DEB/RPM packages remain manual update assets. See [docs/release/auto-updates.md](docs/release/auto-updates.md).

## Setup

```sh
npm install
```

Tauri builds also require the platform prerequisites for Rust and native webview support.

## Development

```sh
npm run dev
npm run tauri:dev
```

The browser dev server includes a sample bundle preview. Full filesystem open/save flows run inside Tauri. In the desktop runtime, Onyx Writer attempts to restore the most recent bundle on startup and falls back to the bundle chooser if that folder is unavailable.

## Verification

```sh
npm run typecheck
npm run test
npm run build
npm run tauri:check
npm run tauri:build
npm run license:check
```

Security/dependency checks for the current release line:

```sh
npm audit --audit-level=high
```

## Storage Model

User documents remain Markdown files in the selected Onyx bundle directory. Onyx Writer does not store user document content in SQLite or another document database.

An Onyx bundle is a user-selected folder containing flat-file OKF documents, reserved system files, generated index boundaries, and managed bundle-local assets. `index.md` and `log.md` are reserved system files; the document tree hides them by default and can reveal them from Settings. Generated `index.md` files may exist at the root and inside subdirectories. The generated portion is bounded by `<!-- onyxwriter:index:start -->` and `<!-- onyxwriter:index:end -->` so prose outside that block is preserved.

Images inserted from the desktop app are copied into `assets/images/` inside the active bundle and referenced from Markdown with relative paths.

Application settings live outside bundles. Imported JSONM design systems and the active design-system id are stored in the Tauri app-data directory, while browser preview mode uses `localStorage`. Recent bundles are app settings; OKF Markdown, bundle assets, and generated `index.md` content stay in the bundle.

Onyx Writer does not create `.onyxwriter`, `.obsidian`, or other hidden app-private folders in source projects by default. If you use OKF alongside code, prefer a nested bundle such as `docs/okf/` or `knowledge/` instead of opening the whole repository root as a bundle. See [docs/guides/okf-in-code-projects.md](docs/guides/okf-in-code-projects.md).

For agentic IDE workflows, Onyx Writer can also be used as a private document observability surface in a `.plandocs` bundle. See [docs/guides/onyx-agent-authoring.md](docs/guides/onyx-agent-authoring.md) for portable Codex, Claude, Cursor, and Windsurf authoring instructions.

## Editing and Autosave

Bundle-backed documents autosave after a short debounce using the same scoped Tauri write path as manual save. The toolbar shows `Unsaved`, `Saving`, `Saved`, or `Error`, and manual save remains available as a fallback. Browser sample bundles are preview-only and do not write to disk.

The document tab strip keeps multiple files open inside a bundle. The toolbar keeps formatting, table, image, link, and undo/redo actions as the primary editing controls. The Visual/Raw selector lives with the save status as a utility control.

## Visualizations

Mermaid fenced blocks render as native visual previews in Visual mode and remain raw-editable in Raw mode. Each rendered diagram includes local zoom, pan, fit, and reset controls. Mermaid rendering uses the bundled dependency only; diagrams are not loaded from a CDN.

The bundle graph button opens an SVG map of the active bundle. The graph includes folders, documents, document links, and broken internal links, while reserved system files remain hidden unless system-file visibility is enabled. The graph uses local D3 physics with animated settling, draggable nodes, hover/focus neighborhood highlighting, and fit/reset controls sized to the current work surface. Document nodes can be selected from the graph to open the underlying Markdown file.

## JSONM Themes

The active JSONM design system styles the app shell, bundle rail, editor and raw editor surfaces, settings, validation states, toolbar, and design-system preview through constrained `--ow-*` token aliases. Appearance mode changes apply to the runtime app, not only to the preview panel.

Enterprise Clean is the default bundled design system for first run and reset.

## Repository Hygiene

This product repository intentionally excludes local planning/runtime material such as Command Deck state, agent workflow files, `.plandocs`, local MCP configuration, generated builds, and machine-specific environment files. See [docs/release/push-hygiene.md](docs/release/push-hygiene.md) for the publication workflow.

## Known Limitations

- OKF support is not complete; the editor currently targets the supported Markdown/frontmatter subset used by Onyx Writer.
- Complex Markdown should be reviewed or edited in Raw mode when the validation/confidence rail says so.
- macOS builds are unsigned and not notarized.
- Linux AppImage packaging is not available yet.
- `v0.1.1-alpha` should be installed manually; `v0.1.2-alpha` and later signed macOS releases can use the in-app updater path.
- Windows builds have not been verified.
- There is no cloud sync, account system, collaboration, or hosted storage.

## Contributing and Support

See [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), and [SECURITY.md](SECURITY.md). The project is MIT licensed; see [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
