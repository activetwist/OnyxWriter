# Bundle Navigation and Workspace Shell

ROU-032 aligns the workspace shell with OKF bundle terminology and adds multi-document navigation primitives.

## Bundle Shell

The left rail shows the active bundle name instead of truncating the full filesystem path. The full path remains available as hover/title context and in settings. Explorer and validation rails can collapse to compact icon rails without changing the active document state.

Folders in the explorer are independently collapsible. Opening a document from the tree, graph, or a Markdown link expands its ancestor folders so the selected file stays visible.

## Document Tabs

Documents open into tabs above the rich-text toolbar. Selecting a document reuses an existing tab when possible. Closing a dirty tab requires confirmation. Autosave runs across dirty open tabs and only marks a tab clean when the saved raw snapshot still matches that tab.

Move, rename, and delete mutations flush dirty tabs before applying filesystem changes, repair internal links, refresh indexes, then remap surviving open tabs to their new paths.

## Managed Indexes

Onyx Writer now refreshes managed `index.md` files for the bundle root and each folder. Root indexes may include OKF version frontmatter; nested indexes do not. All generated sections use the same managed boundary comments, preserving prose outside the generated block.
