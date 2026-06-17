# OKF Editor Foundation

## Architecture

```mermaid
flowchart LR
  User[User] --> Shell[Tauri desktop shell]
  Shell --> Frontend[React app]
  Frontend --> Editor[Tiptap visual editor]
  Frontend --> Raw[CodeMirror raw editor]
  Frontend --> Core[OKF parser and validator]
  Frontend --> Bridge[Tauri command bridge]
  Bridge --> FS[Scoped bundle filesystem]
  Core --> Frontmatter[YAML frontmatter]
  Core --> Markdown[Markdown body and links]
```

## Boundaries

- Tauri owns local filesystem access.
- React owns interface state and editing interactions.
- OKF core owns parse, serialize, validate, and link analysis behavior.
- User document content remains in flat files under the opened bundle root.

## License Posture

The app is MIT. Tauri, Tiptap/ProseMirror, CodeMirror, React, and Vite are compatible with that posture for the selected open-source packages. Tiptap Pro/Cloud/Platform packages and GPL/AGPL dependencies remain out of scope for this milestone.
