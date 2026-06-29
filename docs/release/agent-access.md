# Agent Access Release Notes

ROU-057 introduces the first governed local agent-access surface for Onyx Writer.

## Included

- `onyx` CLI for shell-first workflows.
- `onyx-mcp` MCP stdio sidecar for agent IDEs.
- Governed bundle service primitives for local bundle operations.
- Metadata-only audit log at `.onyx-agent-audit.jsonl`.
- Agent Access settings tab with copyable setup snippets.

## Scope

The first slice is local-only and intentionally lightweight:

- no HTTP MCP server,
- no localhost port,
- no background daemon,
- no remote storage,
- no encryption,
- no account system.

## Known Limitations

- CLI/MCP packaging into platform installers still needs release verification.
- The Node agent runtime mirrors existing UI/Rust rules; deeper shared-core extraction can reduce drift later.
- MCP client configuration differs by IDE, so the settings snippets are starting points.
- Audit records are stored in the bundle root and should be reviewed before publishing a bundle if that metadata is sensitive.
