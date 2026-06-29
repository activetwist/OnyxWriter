# Onyx MCP

`onyx-mcp` is the local MCP stdio sidecar for Onyx Writer bundles.

It is designed for agent IDEs that support MCP. The sidecar is launched by the agent client and communicates over stdio only. It does not open a localhost port, run as a background server, or expose raw filesystem writes.

## Example Configuration

```json
{
  "mcpServers": {
    "onyxwriter": {
      "command": "onyx-mcp",
      "args": ["--root", "/absolute/path/to/.plandocs"]
    }
  }
}
```

During local development from this repository, use:

```json
{
  "mcpServers": {
    "onyxwriter": {
      "command": "npm",
      "args": ["run", "onyx:mcp", "--", "--root", "/absolute/path/to/.plandocs"]
    }
  }
}
```

## Resources

The sidecar exposes bundle context as MCP resources:

- `onyx://bundle/info`
- `onyx://bundle/tree`
- `onyx://bundle/validation`
- `onyx://bundle/graph`
- `onyx://document/{path}` for Markdown documents
- `onyx://asset/{path}` for bundle image assets

## Tools

The sidecar exposes governed tools:

- `onyx.bundle.info`
- `onyx.bundle.validate`
- `onyx.bundle.tree`
- `onyx.document.read`
- `onyx.document.create`
- `onyx.document.update`
- `onyx.document.move`
- `onyx.document.rename`
- `onyx.document.delete`
- `onyx.asset.import`
- `onyx.index.refresh`
- `onyx.links.check`
- `onyx.graph.export`

Tool inputs are schema-bound and bundle-relative unless a source asset path is explicitly requested. Mutating tools reject unsafe paths, reserved concept-file misuse, and stale writes where preconditions are supplied.

## Security Model

`onyx-mcp` is local-only. The agent client launches it with an explicit `--root` bundle path or `ONYX_BUNDLE_ROOT`. It should be configured per bundle or per trusted project.

The sidecar does not:

- listen on HTTP,
- expose a network port,
- write outside the configured bundle root,
- decrypt remote encrypted bundles,
- sync remote storage,
- send document contents anywhere by itself.

## Audit Log

Mutating MCP calls append metadata-only records to `.onyx-agent-audit.jsonl` in the bundle root. Audit records do not include document contents.
