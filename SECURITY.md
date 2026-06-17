# Security Policy

## Supported Versions

Onyx Writer has not published a stable release yet. Security fixes are handled on the active alpha development line until stable version support is defined.

## Reporting a Vulnerability

Use GitHub private vulnerability reporting if enabled. If it is not enabled, open a minimal public issue that states a security report is needed without including exploit details.

## Security Boundaries

Onyx Writer is local-first software:

- User documents remain in user-selected bundle folders.
- Application settings are stored outside bundles.
- Imported JSONM is treated as declarative data, not executable code.
- Mermaid rendering is configured for local preview and should not load remote rendering services.
- The desktop filesystem bridge should remain scoped to user-selected paths.
