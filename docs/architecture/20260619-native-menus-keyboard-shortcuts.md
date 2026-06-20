# Native Menus and Keyboard Shortcuts

Date: 2026-06-19
Milestone: ROU-046

## Scope

Onyx Writer uses a native Tauri menu shell for desktop builds and a typed React command dispatcher for behavior. Rust owns menu construction and emits stable command IDs. React owns document, bundle, editor, and settings behavior.

## Command Bridge

The desktop menu is installed from `src-tauri/src/menu.rs` during Tauri setup. Custom menu items use command IDs such as `bundle.open`, `document.save`, and `editor.bold`. When a custom menu item is selected, Rust emits:

```text
onyxwriter://menu-command
```

with payload:

```json
{ "command": "bundle.open" }
```

The React app listens for that event only when the Tauri runtime is present. Browser and MAMP previews skip the native event listener and continue using toolbar/button interactions.

## Frontend Dispatch

`src/lib/appCommands.ts` defines the allowed `AppCommand` and `EditorCommand` values. `AppShell` owns the dispatcher and routes commands to existing app callbacks:

- Bundle commands: open, create, refresh
- Document commands: new document, new folder, save, rename, delete
- Tab commands: close, next, previous
- View commands: visual/raw toggle, graph, explorer, validation, settings
- Editor commands: paragraph, headings, bold, italic, code, lists, link, unlink, table, image, undo, redo

Editor commands are forwarded to `EditorToolbar` through a command request object so menu actions use the same TipTap command behavior as toolbar buttons, including the link editor popover.

## Shortcut Policy

The command layer normalizes primary modifier behavior across platforms:

- macOS: Command
- Windows/Linux: Control

Global shortcuts:

- `Cmd/Ctrl+O`: Open Bundle
- `Cmd/Ctrl+Shift+O`: Create Bundle
- `Cmd/Ctrl+N`: New Document
- `Cmd/Ctrl+Shift+N`: New Folder
- `Cmd/Ctrl+S`: Save
- `Cmd/Ctrl+R`: Refresh Bundle
- `Cmd/Ctrl+W`: Close active tab
- `Ctrl+Tab`: Next tab
- `Ctrl+Shift+Tab`: Previous tab
- `Cmd/Ctrl+Backtick`: Toggle Visual/Raw
- `Cmd/Ctrl+Shift+G`: Toggle graph
- `Cmd/Ctrl+Shift+E`: Toggle explorer
- `Cmd/Ctrl+Shift+M`: Toggle validation
- `Cmd/Ctrl+,`: Open settings

Visual editor shortcuts:

- `Cmd/Ctrl+B`: Bold
- `Cmd/Ctrl+I`: Italic
- `Cmd/Ctrl+K`: Add/edit link
- `Cmd/Ctrl+Shift+K`: Remove link
- `Cmd/Ctrl+Alt+0`: Paragraph
- `Cmd/Ctrl+Alt+1`: Heading 1
- `Cmd/Ctrl+Alt+2`: Heading 2
- `Cmd/Ctrl+Alt+3`: Heading 3
- `Cmd/Ctrl+Shift+7`: Ordered list
- `Cmd/Ctrl+Shift+8`: Bullet list

Raw editor mode keeps CodeMirror editing shortcuts authoritative. Visual editor formatting shortcuts are ignored in raw mode.

## Non-Goals

This pass does not add configurable keybindings, a command palette, multi-window document behavior, file associations, Save As, export, print, or find/replace.
