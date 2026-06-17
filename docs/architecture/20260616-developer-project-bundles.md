# Developer Project Bundles

ROU-036 makes OKF bundles safer to use inside source repositories.

## Boundary

An OKF bundle remains a directory of Markdown files. Onyx Writer treats the user-selected bundle root as the content boundary and keeps app-private state outside that directory by default. The app does not create `.onyxwriter`, `.obsidian`, or another hidden project folder in source repositories.

Bundle-local writes are limited to OKF Markdown, managed `index.md` sections, and bundle-local assets such as `assets/images/`.

App-private state includes recent bundle paths, open-tab session metadata, imported JSONM systems, and active design-system settings. Session and recent-bundle records store paths only and do not store document contents.

## Project Detection

When a selected folder contains source-project markers such as `.git`, `package.json`, `Cargo.toml`, `pyproject.toml`, `composer.json`, or `go.mod`, Onyx treats it as a likely code project.

Opening the folder as a bundle requires an explicit confirmation. Creating a bundle from that folder uses a nested-path flow, with `docs/okf` as the default suggestion.

## Scanner Ignores

The Tauri scanner and frontend tree utilities ignore common development directories:

```text
.git
node_modules
dist
build
target
.venv
__pycache__
.idea
.vscode
coverage
vendor
```

Ignored entries are excluded from the explorer, link suggestions, graph nodes, and managed index generation.

## Optional Bundle Metadata

ROU-036 does not add a portable Onyx-specific bundle metadata file. OKF conformance should not depend on Onyx-owned metadata, and the current feature set can be represented through the selected directory, reserved OKF files, and app-private settings.

If a future portable bundle manifest becomes useful, it should be optional, explicitly documented as non-required for OKF conformance, and designed for interoperability rather than Onyx lock-in.
