# Manual QA Checklist

Run this checklist against the actual Tauri desktop shell before a release candidate.

## First Run

- Launch Onyx Writer with no recent bundle.
- Confirm the default desktop window opens around 1280x860 and the toolbar does not wrap awkwardly.
- Confirm the left rail exposes icon-only Open Bundle and Create Bundle actions with clear tooltips.
- Confirm the main no-bundle work surface is quiet: no large logo, no eyebrow, concise instruction text only.
- Create a bundle in an empty folder.
- Confirm `index.md` is created and hidden from the default tree.
- Reveal system files in Settings and confirm `index.md` appears.
- In Settings > Bundles, create the seed bundle in a real system folder and confirm it opens as the active bundle.

## Bundle Files

- Create a folder and document.
- Collapse and expand nested folders in the left rail.
- Collapse and expand the file explorer rail.
- Collapse and expand the validation rail.
- Rename a document and confirm the mutation dialog previews affected paths.
- Select a folder in the left rail and confirm Rename/Delete target the selected folder, not the active document tab.
- Drag a document into a folder and confirm the drag target highlights before drop.
- Drag a folder to another folder and confirm invalid self/descendant drops are rejected.
- Delete a document and confirm destructive copy appears before applying.
- Confirm deterministic root and nested `index.md` files update after each operation while preserving prose outside managed blocks.

## Developer Projects

- Create or choose a real source-project folder with `.git` or `package.json`.
- Try opening the project root as a bundle and confirm Onyx warns before managing the whole repository.
- Cancel the warning and confirm no `index.md`, `.onyxwriter`, `.obsidian`, or other app-private folder is created in the project root.
- Use Create Bundle on the project root and confirm Onyx offers a nested path such as `docs/okf`.
- Create the nested bundle and confirm only that subfolder is initialized and opened.
- Confirm `.git`, `node_modules`, `dist`, `build`, `target`, `.venv`, `.idea`, `.vscode`, `coverage`, and `vendor` are ignored by the tree, graph, link suggestions, and managed indexes.

## Links

- Add relative links between two documents.
- Rename and move one linked document.
- Confirm links are repaired and no broken-link warnings remain.
- Add an image and confirm image paths are not treated as document links.

## Editing

- Use Visual mode for headings, bold, italic, links, lists, tables, and images.
- Open several documents and confirm each document remains available as a tab above the editor toolbar.
- Confirm the native menu bar is visible in the installed desktop app and includes Onyx Writer, File, Edit, Format, Insert, View, Window, and Help menus.
- Use native menu items for Open Bundle, Create Bundle, New Document, New Folder, Save, Refresh Bundle, Close Tab, Visual/Raw toggle, Bundle Graph, Settings, and basic formatting actions.
- Confirm Command/Control+R refreshes the bundle instead of reloading or blanking the desktop app.
- Use Ctrl+Tab to move to the next open document tab, and Ctrl+Shift+Tab to move to the previous tab.
- Use Command+W on macOS and confirm it closes the active document tab instead of closing the application window.
- Use Command/Control+B, Command/Control+I, Command/Control+K, and Command/Control+Shift+K in Visual mode and confirm they match toolbar behavior.
- Confirm raw editor shortcuts remain CodeMirror-driven and visual formatting shortcuts do not mutate raw text unexpectedly.
- Close a tab and confirm the neighboring tab remains open.
- Quit and reopen the app and confirm the prior bundle, open document tabs, and active tab are restored; missing saved tabs should be skipped with a clear status.
- Use table-specific controls while a table is selected.
- Toggle Raw mode and confirm Markdown remains readable.
- Confirm autosave transitions through Saving and Saved.
- Confirm manual save still works.

## Validation

- Remove required frontmatter and confirm the validation panel shows an error.
- Add a broken Markdown document link and confirm it appears under Broken Links.
- Add fenced SQL, Mermaid, or complex Markdown and confirm Editor Confidence notices appear.

## Visualization

- Use the seed bundle to open multiple documents with Mermaid fenced blocks and confirm visual rendering, pan, zoom, fit, and reset.
- Open the seed bundle graph and confirm nested folders, cross-folder links, animated settling, smaller readable nodes, pan, zoom, fit, reset, hover/focus neighborhood highlighting, node drag/release, and document selection.
- Toggle system-file visibility and confirm graph/system nodes follow the setting.

## JSONM

- Import a valid JSONM design system.
- Preview it in Settings.
- Apply it and confirm shell, toolbar, editor, raw editor, validation, and settings surfaces change together.
- Open the JSONM Spec on GitHub action from the Design System tab and confirm it opens in the system browser.
- Reset to Enterprise Clean.

## Responsive and Errors

- Narrow the window to the minimum desktop size and confirm toolbar controls wrap without overlap.
- Confirm Visual/Raw and Save remain icon-only and understandable through active state, tooltip, and status line.
- Try opening a missing recent bundle and confirm it is forgotten with a clear status message.
- Try importing invalid JSONM and confirm the settings panel reports validation errors.

## Updates

- Open Settings > Updates in the browser/MAMP preview and confirm update checks show an unavailable desktop-runtime state instead of crashing.
- Open Settings > Updates in the installed Tauri application and confirm Check for Updates reaches the GitHub release channel.
- With no later signed release available, confirm the app reports that it is up to date.
- With a later signed test release available, confirm the app reports the new version, release body, and install action.
- Install the update and confirm the app reports that restart is required rather than silently restarting.
- Restart Onyx Writer and confirm the new version is active.
- Temporarily break the update endpoint or network and confirm the UI shows a release-channel/network failure.
- Test invalid or mismatched signature metadata in a controlled release draft and confirm the UI distinguishes signature verification failure.
- Confirm `v0.1.0-alpha` remains documented as manual-only because it does not contain updater code.

## Linux Package QA

- On JARVIS or another Linux QA machine, install the produced Linux artifact from `.artifacts/ROU-037-linux/` or the GitHub release download.
- Confirm the application launches as Onyx Writer.
- Confirm Open Bundle and Create Bundle can select real filesystem folders.
- Confirm a nested OKF bundle inside a code project opens without managing the project root.
- Confirm external links open in the default browser.
- Confirm app settings are not written into the opened OKF bundle.
- Confirm Linux DEB/RPM builds are treated as manual update packages until AppImage packaging is restored.
