# Bundle UX, Branding, and Rich Editor Tools

Date: 2026-06-15
Milestone: ROU-023

## Bundle Model

A bundle is a folder-backed OKF document space. It contains flat-file OKF Markdown documents, reserved system files, generated index boundaries, and managed bundle-local assets.

```mermaid
flowchart LR
  Bundle[Onyx bundle folder] --> Docs[OKF Markdown documents]
  Bundle --> Reserved[index.md / log.md]
  Bundle --> Assets[assets/images]
  Docs --> Tree[Document tree]
  Reserved --> SystemToggle[Show System Files]
  Assets --> Images[Markdown image references]
```

## Settings

Settings are split into tabs so bundle management and design-system selection do not compete for the same surface.

```mermaid
flowchart TD
  Settings[Settings dialog] --> Bundles[Bundles tab]
  Settings --> Design[Design System tab]
  Bundles --> Open[Open Bundle]
  Bundles --> Create[Create Bundle]
  Bundles --> Recent[Recent Bundles]
  Bundles --> System[Show System Files]
  Design --> JSONM[JSONM picker/import/preview]
```

## Editor Toolbars

The primary toolbar carries common writing commands. A contextual table toolbar appears only when the selection is inside a table. After ROU-024, Visual/Raw switching and save state are utility controls on the right side of the toolbar.

```mermaid
flowchart TD
  Editor[Visual editor] --> Primary[Primary toolbar]
  Primary --> Basic[Headings, marks, lists, links]
  Primary --> Insert[Insert table / image]
  Editor --> Context{Selection in table?}
  Context -->|yes| TableTools[Table toolbar]
  Context -->|no| Hidden[No table toolbar]
```

## Image Assets

Desktop image insertion copies the selected image into `assets/images/` inside the active bundle. Markdown stores relative references such as:

```md
![Alt text](assets/images/example.png)
```

This avoids base64 document payloads and keeps bundle content portable.

## Brand Asset

The runtime logo is copied from `.plandocs/logo/onyxwriter-logo.png` into app-owned assets at `src/assets/brand/onyxwriter-logo.png`. The app does not reference `.plandocs` at runtime.
