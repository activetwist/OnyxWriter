# Contributing

Onyx Writer is in public alpha. Contributions are welcome, especially focused bug reports, OKF round-trip cases, packaging notes, documentation fixes, and small pull requests that improve reliability without expanding the release scope unexpectedly.

Before opening a pull request:

- Open an issue with a clear reproduction, expected behavior, and environment details.
- Keep pull requests focused on one problem or feature.
- Run the verification commands before submitting a pull request:

```sh
npm run typecheck
npm run test
npm run build
npm run license:check
npm audit --audit-level=high
```

## Development Notes

Onyx Writer is a Tauri + React application. Browser development is useful for UI work, but filesystem-backed bundle workflows should be verified in the Tauri desktop shell.

User documents are flat files. Changes that affect bundle mutation, link repair, deterministic indexes, raw/visual round-tripping, or storage boundaries should include focused tests.

The project is intentionally local-first. Do not introduce cloud services, telemetry, hosted collaboration, or document databases without prior architecture discussion.

## Dependency Policy

The project targets permissive licensing for its first release line. Do not add GPL, AGPL, Tiptap Pro, hosted collaboration, or cloud-only dependencies without a dedicated license and architecture review.
