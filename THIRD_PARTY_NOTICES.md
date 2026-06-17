# Third-Party Notices

Onyx Writer is distributed under the MIT License. The first release line is designed to use permissive, MIT-compatible dependencies.

## Runtime and Framework

- Tauri packages and crates: MIT or Apache-2.0, depending on package.
- React: MIT.
- Vite: MIT.
- TypeScript: Apache-2.0.

## Editing

- Tiptap open-source packages (`@tiptap/*`), including StarterKit, Link, Table, TableRow, TableCell, TableHeader, and Image extensions: MIT. Do not add `@tiptap-pro/*`, Tiptap Cloud, Tiptap Platform, or managed collaboration packages without a new license review.
- ProseMirror packages consumed through Tiptap: MIT.
- CodeMirror packages (`@codemirror/*`): MIT.
- YAML parser package (`yaml`): ISC.
- Lucide React icons: ISC.

## Visualization

- Mermaid: MIT. Used for local rendering of Mermaid fenced blocks in visual preview mode.
- D3 force, selection, zoom, and drag packages (`d3-force`, `d3-selection`, `d3-zoom`, `d3-drag`): ISC. Used for the bundle graph SVG layout and interaction model.

## Format References

The OKF reference material used during development is Apache-2.0. This project may reference the public format behavior, but copied source text or code must preserve required Apache-2.0 notices.

The smoke-test fixture corpus is synthetic Onyx Writer test data created for validator and round-trip coverage. It is not copied from the OKF reference source.

JSONM specification/schema material is authored by Active Twist and documented as Apache-2.0 for the spec/reference materials. Onyx Writer ships JSONM schema, token-map, baseline, and archetype payload assets as declarative design-system data with a constrained local compiler.

## Dependency Policy

The initial release line must avoid GPL and AGPL dependencies unless a fresh evaluate/contract cycle explicitly approves a licensing change.
