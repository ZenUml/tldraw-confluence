# Whiteboard E2E harness

This directory contains the Playwright workspace for the Confluence Whiteboard macro.

## WP1 status

WP1 provides collection plumbing only. It has exactly one harness sentinel and
**zero product UI assertions**. Collection proves that Playwright can load the
configuration and discover a spec; it is not an E2E run and supplies no UI evidence.

From the repository root, collect the sentinel with:

```bash
pnpm test:e2e:list
```

Or invoke the workspace directly:

```bash
pnpm --filter @zenuml/tldraw-confluence-e2e test:list
```

Both commands must work without credentials, a `.env` file, an installed browser,
an auth state, a tenant URL, or network access.

## WP2 handoff

WP2 removes the sentinel and introduces the first behavioral suite. Its child design
owns all of the following:

- approved staging fixture and authentication configuration;
- synthetic legacy KVS fixtures and semantic fingerprints;
- page objects and Forge iframe helpers;
- create, load, edit, resize, save, reload, and failure journeys;
- screenshots, traces, and resolver or network evidence for UI assertions.

Until those pieces exist, do not add skipped product journeys or describe this
directory as product coverage. See the
[approved renovation design](../../docs/superpowers/specs/2026-08-31-tldraw-confluence-renovation-design.md).
