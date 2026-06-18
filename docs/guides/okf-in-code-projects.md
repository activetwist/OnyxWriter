# OKF Bundles in Code Projects

OKF bundles are plain Markdown directories, so they can live next to source code without requiring a hosted service or document database. The recommended pattern is to place the bundle in a project subdirectory rather than using the whole repository root as the bundle.

## Recommended Layouts

Documentation-centered projects:

```text
my-app/
  src/
  package.json
  docs/
    okf/
      index.md
      systems/
        api.md
      decisions/
        auth.md
```

Knowledge-centered projects:

```text
platform/
  services/
  infrastructure/
  knowledge/
    index.md
    domains/
      billing.md
    runbooks/
      incident-response.md
```

Both layouts keep OKF documents versioned with the project while avoiding source, build, dependency, and IDE folders.

For private agent-planning workflows, a hidden `.plandocs/` bundle is also acceptable when that folder is intentionally treated as the Onyx root. See [onyx-agent-authoring.md](onyx-agent-authoring.md) for portable instructions that can be copied into `AGENTS.md`, `CLAUDE.md`, Cursor rules, or Windsurf rules.

## What Onyx Writes

Inside the selected bundle, Onyx Writer may write:

- OKF concept Markdown files.
- Reserved `index.md` files with managed sections bounded by `<!-- onyxwriter:index:start -->` and `<!-- onyxwriter:index:end -->`.
- Bundle-local images under `assets/images/` when images are inserted from the desktop app.

Onyx Writer does not create `.onyxwriter`, `.obsidian`, or other hidden app-private folders in your source repository by default.

Application settings live outside the bundle:

- Recent bundle paths and open-tab session metadata store paths only, not document contents.
- Imported JSONM design systems and active design-system selection live in app settings.
- Browser preview mode uses local browser storage.

## Opening a Repository Root

Opening a whole repository as a bundle is allowed only when deliberate. If Onyx sees project-root signals such as `.git`, `package.json`, `Cargo.toml`, `pyproject.toml`, `composer.json`, or `go.mod`, it warns before managing that folder as a bundle.

When creating a bundle from a project root, Onyx prompts for a nested path such as `docs/okf` and initializes that subfolder as the active bundle.

## Ignored Folders

Onyx ignores common development and build directories when scanning a bundle:

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

Ignored folders do not appear in the document tree, graph, link suggestions, or generated indexes.

## IDE Support

OKF files are Markdown with YAML frontmatter, so most editors can open them immediately. Future IDE support could add OKF validation, frontmatter completion, link completion, and diagnostics, but no IDE extension is required to use an OKF bundle today.

When an agentic IDE writes documentation for a project, give it explicit Onyx bundle rules so it does not skip hidden `.plandocs` folders, create concept documents without frontmatter, or hand-edit generated index regions. The portable guide is [onyx-agent-authoring.md](onyx-agent-authoring.md).
