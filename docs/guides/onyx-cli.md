# Onyx CLI

`onyx` is the shell interface for governed Onyx Writer bundle operations.

It is intended for humans, scripts, CI, and local agents that prefer CLI execution over MCP. It requires an explicit bundle root and uses the same local authoring rules as Onyx Writer: safe paths, reserved-file protection, OKF validation, link repair, and deterministic index refresh.

## Examples

```sh
npm run onyx -- bundle info --root .plandocs --json
npm run onyx -- bundle validate --root .plandocs --json
npm run onyx -- bundle tree --root .plandocs --json
```

Create a document:

```sh
npm run onyx -- doc create \
  --root .plandocs \
  --path briefs/new-brief.md \
  --type brief \
  --title "New Brief" \
  --json
```

Read a document and capture its hash:

```sh
npm run onyx -- doc read --root .plandocs --path briefs/new-brief.md --json
```

Update with a stale-write precondition:

```sh
npm run onyx -- doc update \
  --root .plandocs \
  --path briefs/new-brief.md \
  --content-file /tmp/new-brief.md \
  --expected-hash SHA256_FROM_READ \
  --json
```

Move a document and repair links/indexes:

```sh
npm run onyx -- doc move \
  --root .plandocs \
  --from briefs/new-brief.md \
  --to archive/new-brief.md \
  --json
```

Refresh deterministic indexes:

```sh
npm run onyx -- index refresh --root .plandocs --json
```

Export graph data:

```sh
npm run onyx -- graph export --root .plandocs --json
```

## Exit Codes

- `0`: success.
- `1`: general error.
- `3`: stale-write conflict.
- `64`: command usage error.
- `65`: unsafe path or reserved-file operation.

## Audit Log

Mutating commands append metadata-only records to `.onyx-agent-audit.jsonl` in the bundle root. Audit records include operation, path, result, and caller surface. They do not include document contents.
