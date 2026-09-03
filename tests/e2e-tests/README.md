# Whiteboard E2E harness

This directory contains the Playwright workspace for the Confluence Whiteboard macro.

## WP2 local synthetic coverage

The checked-in suite runs two Vite development servers with named synthetic adapters.
It proves the local loading/error UI, zero initial save, one explicit stroke save,
recovery filename, build surface, and production-mock exclusion contract. Screenshots
are written only to Playwright's ignored output directory.

From the repository root, collect the sentinel with:

```bash
pnpm test:e2e:list
```

Or invoke the workspace directly:

```bash
pnpm --filter @zenuml/tldraw-confluence-e2e test:list
```

Collection must work without credentials, a `.env` file, an installed browser, an
auth state, a tenant URL, or network access. A full local run requires Chromium:

```bash
pnpm --filter @zenuml/tldraw-confluence-e2e test
```

## Real Forge handoff

The local synthetic suite is not real-Forge evidence. Exact-SHA staging/PVT still owns:

- approved staging fixture and authentication configuration;
- synthetic legacy KVS fixtures and semantic fingerprints;
- page objects and Forge iframe helpers;
- create, load, edit, resize, save, reload, and failure journeys;
- screenshots, traces, and resolver or network evidence for UI assertions.

Do not describe collection or the synthetic suite as Atlassian UI evidence. See the
[approved renovation design](../../docs/superpowers/specs/2026-08-31-tldraw-confluence-renovation-design.md).
