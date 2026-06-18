# Onyx Agent Authoring Guide

This guide is a portable instruction file for using Codex, Claude, Cursor, Windsurf, or another agentic IDE inside a project where Onyx Writer is the document observability surface.

The goal is simple: agents may create and update project knowledge as OKF-compatible Markdown without making the bundle noisy, invalid, or invisible in Onyx Writer.

## Default Bundle Root

Use this environment variable or plain instruction in agent sessions:

```sh
ONYX_BUNDLE_ROOT=.plandocs
```

`.plandocs` is a good private working convention when the directory is intentionally used as an Onyx bundle and mostly contains Markdown/OKF documents, with optional bundle-local assets. Because it is a dotfolder, agents must not skip it just because hidden paths are often ignored during broad source scans.

For public documentation that should be discovered by humans browsing the repository, prefer a visible bundle root such as `docs/okf` or `knowledge`. For private planning, orchestration, research, and project memory, `.plandocs` is acceptable.

## Copy-Paste Agent Instructions

Place this block in `AGENTS.md`, `CLAUDE.md`, Cursor rules, Windsurf rules, or a project-specific agent prompt.

```markdown
## Onyx Writer Bundle Authoring

Use `.plandocs` as the Onyx Writer bundle root unless the user specifies another path.

When creating or editing project knowledge documents:
- Treat `.plandocs` as a first-class workspace even though it is a hidden directory.
- Create `.plandocs/index.md` if it does not exist.
- Do not use `index.md` or `log.md` as concept documents; they are reserved system files.
- Every non-reserved `.md` concept document must include parseable YAML frontmatter with a non-empty `type`.
- Preserve user prose and unknown frontmatter fields.
- Do not edit content between `<!-- onyxwriter:index:start -->` and `<!-- onyxwriter:index:end -->`.
- Prefer bundle-absolute Markdown links with `.md`, such as `/decisions/editor-storage.md`.
- Avoid Obsidian-style `[[wikilinks]]`.
- Store images under a bundle-local asset folder such as `.plandocs/assets/images/` and reference them with Markdown image syntax.
- Ignore development and generated folders when scanning or linking: `.git`, `node_modules`, `dist`, `build`, `target`, `.venv`, `venv`, `__pycache__`, `.idea`, `.vscode`, `coverage`, and `vendor`.

Before finishing a documentation task, verify that changed concept documents have YAML frontmatter, a non-empty `type`, and links that resolve inside the Onyx bundle when they are intended to be local links.
```

## Initialize a Bundle

If `.plandocs` does not exist, create it before writing documents:

```text
.plandocs/
  index.md
```

The root `index.md` may declare the OKF version and should reserve a managed region for Onyx Writer:

```markdown
---
okf_version: "0.1"
---

# Index

<!-- onyxwriter:index:start -->
## Documents

<!-- onyxwriter:index:end -->
```

Agents may add prose outside the managed block, but must leave the managed block itself to Onyx Writer.

## Concept Documents

Every non-reserved Markdown file inside the bundle is a concept document. It should have YAML frontmatter and a non-empty `type`.

Recommended fields:

```yaml
---
type: concept
title: Example Concept
description: Short plain-language summary.
tags:
  - planning
timestamp: "2026-06-17"
---
```

Rules:

- Keep unknown frontmatter fields intact.
- Keep user prose intact unless the task explicitly asks for a rewrite.
- Use stable, lowercase, hyphenated filenames.
- Use folders for durable information architecture, not temporary grouping.
- Do not create concept documents named `index.md` or `log.md`.

## Links

Use standard Markdown links.

Preferred local link style:

```markdown
[Storage decision](/decisions/storage-directory.md)
```

This is bundle-absolute, includes `.md`, and remains understandable outside Onyx Writer.

Relative links are acceptable when the relationship is local and clear:

```markdown
[Next step](../plans/next-release.md)
```

Avoid:

```markdown
[[Storage decision]]
```

Use external links normally:

```markdown
[Open Knowledge Format](https://github.com/google/open-knowledge-format)
```

## Images and Assets

When adding images, keep them inside the bundle rather than scattering them through the source tree.

Recommended layout:

```text
.plandocs/
  assets/
    images/
      architecture-overview.png
```

Reference images with Markdown:

```markdown
![Architecture overview](/assets/images/architecture-overview.png)
```

Do not embed large binary files unless the user wants them versioned with the project.

## Ignored Paths

Agents should not create links, generated indexes, or knowledge documents from these development paths:

```text
.git
node_modules
dist
build
target
.venv
venv
__pycache__
.idea
.vscode
coverage
vendor
```

If one of these folders exists inside the bundle by accident, treat it as ignored infrastructure, not Onyx knowledge.

## Templates

### Generic Concept

```markdown
---
type: concept
title: Example Concept
description: One-sentence explanation of the concept.
tags:
  - example
timestamp: "2026-06-17"
---

# Example Concept

Write the concept in plain Markdown.

## Links

- [Related concept](/path/to/related-concept.md)
```

### Decision Note

```markdown
---
type: decision
title: Storage Directory Strategy
description: Decision record for how project documents are stored.
tags:
  - decision
  - storage
timestamp: "2026-06-17"
---

# Storage Directory Strategy

## Decision

State the decision.

## Context

Explain the constraints and tradeoffs.

## Consequences

List expected effects and follow-up work.
```

### Project Plan

```markdown
---
type: plan
title: Alpha Release Plan
description: Working plan for the next release.
tags:
  - plan
  - release
timestamp: "2026-06-17"
---

# Alpha Release Plan

## Goal

Define the outcome.

## Scope

- In scope:
- Out of scope:

## Tasks

- [ ] First task
- [ ] Second task

## References

- [Related decision](/decisions/release-channel.md)
```

### Research Note

```markdown
---
type: research
title: OKF Editor Research
description: Findings and open questions for editor behavior.
tags:
  - research
timestamp: "2026-06-17"
---

# OKF Editor Research

## Summary

Capture the short answer first.

## Findings

- Finding one.
- Finding two.

## Open Questions

- Question one.

## Sources

- [Source title](https://example.com)
```

## Completion Checklist

Before ending an agent session that touched the Onyx bundle:

- Confirm `.plandocs/index.md` exists.
- Confirm changed concept documents have YAML frontmatter.
- Confirm every changed concept document has a non-empty `type`.
- Confirm local links intended for Onyx navigation resolve inside the bundle.
- Confirm no concept document was created as `index.md` or `log.md`.
- Confirm managed index blocks were not hand-edited.
- Confirm new images live under a bundle-local asset path.
