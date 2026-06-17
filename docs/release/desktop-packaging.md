# Desktop Packaging

Onyx Writer uses Tauri as the desktop shell and keeps the browser build available for MAMP review.

## Commands

```sh
npm run tauri:check
npm run tauri:build
```

`npm run tauri:check` runs a Rust compile check against `src-tauri/Cargo.toml`. `npm run tauri:build` runs the production web build and then creates the Tauri desktop build and active platform bundles.

## Naming and Icons

- Product name: `Onyx Writer`
- Window title: `Onyx Writer`
- Default window: `1280x860`
- Minimum window: `960x680`
- Bundle identifier: `app.onyxwriter.desktop`
- Icon source: `src/assets/brand/onyxwriter-logo.png`
- Generated Tauri icons: `src-tauri/icons/`

The generated icon set includes PNG, ICNS, ICO, Windows Store logo, iOS, and Android variants. Mobile targets are not part of the current release scope.

## Storage Boundary

Bundles are user-selected folders. OKF Markdown files, bundle-local images, reserved system files, and deterministic root and nested `index.md` content remain inside the bundle.

App settings are not bundle content. Imported JSONM systems and the active design-system id are stored under the Tauri app-data directory via `design_system_fs.rs`. Browser preview mode stores equivalent settings in `localStorage`.

## Signing and Notarization

Signing and notarization are intentionally deferred until the first release candidate. The codebase now has product naming and platform icon assets in place, but certificate selection, Apple notarization setup, and Windows signing should be handled as a release-operations task.
