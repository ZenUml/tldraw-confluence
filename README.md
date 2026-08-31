# Confluence Whiteboard

This repository contains the standalone Forge app that provides a Whiteboard macro
for Confluence Cloud. Its internal product identifier remains `tldraw` while neutral
domain language uses **Whiteboard**.

The app is being renovated in this repository before it is merged into
[`ZenUml/conf-app`](https://github.com/ZenUml/conf-app) as an isolated fifth product
variant. The approved programme is documented in the
[renovation design](docs/superpowers/specs/2026-08-31-tldraw-confluence-renovation-design.md).

## Identity and data continuity

Renovation must preserve the existing installation lineage:

- Forge app ID `368b610d-bac1-4e2a-9311-6ec0adca5e49`;
- macro key `whiteboard`;
- `storage:app` access to the existing Forge KVS namespace;
- legacy KVS key derivation and stored values unless a later migration is separately
  designed, tested, and approved.

During this programme, Forge KVS remains the system of record for Whiteboard bodies.
A move to Confluence custom content is a separate, post-merge project.

## Toolchain

- Node.js `22.22.3` for authoritative local and CI validation
- pnpm `10.34.5`
- the Forge runtime declared in `manifest.yml`

Install the workspace from the repository root:

```bash
pnpm install --frozen-lockfile
```

Do not install the root, frontend, and migration helper as separate npm projects.
The workspace uses one root lockfile.

For the WP1 npm-to-pnpm conversion, the user approved Option A on 2026-08-31:
the shared solver may converge only `jest-worker > @types/node` from 18.11.9 to
22.13.9, `randombytes > safe-buffer` from 5.1.2 to 5.2.1, and add
`@types/node@22.13.9 > undici-types@6.20.0` in the `static/spa` build graph. This is
not permission for any other product or runtime dependency drift.

## Validation commands

The stable repository interface is:

| Command | Meaning |
|---|---|
| `pnpm lint` | Lint the existing resolver and frontend without rewriting them. |
| `pnpm test:unit` | Run repository-level operational contract tests. |
| `pnpm build:whiteboard` | Build the existing Whiteboard frontend into `static/spa/build`. |
| `pnpm validate:resource-output` | Check the generated Forge resource without rewriting it. |
| `pnpm validate:manifest` | Run deterministic structural manifest validation through the pinned internal `@forge/manifest` package. |
| `pnpm test:e2e:list` | Collect one non-product Playwright harness sentinel. |
| `pnpm validate` | Run the complete secretless/offline WP1 and PR validation contract. |
| `pnpm forge:lint` | Run the official authenticated Forge CLI lint separately. |

`pnpm validate:manifest` is intentionally narrower than official Forge CLI lint; it
does not prove every platform rule. `pnpm validate` includes it and does not invoke
`pnpm forge:lint`, contact Forge, or require Forge credentials. Official Forge lint
runs only on a developer machine that already has credentials or immediately before
deploy in the protected staging and production jobs. Pull-request jobs receive no
Forge secrets.

WP1 has **zero product Playwright assertions**. A successful
`pnpm test:e2e:list` is collection evidence only—it is not an E2E or UI pass.
Behavioral Forge tests begin in WP2 and must include browser-visible or
resolver/network evidence.

## Repository layout

| Path | Responsibility |
|---|---|
| `manifest.yml` | Existing Forge identity, macro, resource, permissions, and runtime. |
| `src/` | Forge resolver and macro configuration. |
| `static/spa/` | React Whiteboard frontend and generated Forge resource. |
| `tests/e2e-tests/` | WP1 collection harness; behavioral coverage is deferred to WP2. |
| `docs/policies/` | Repository safety and delivery rules. |
| `docs/superpowers/` | Approved programme design and implementation plans. |

## Development and delivery

WP1 standardizes tooling and delivery without changing runtime behavior, the storage
schema, Forge identity, or the editor SDK. Normal deployment never registers or
installs the app. Installation is a separately authorized bootstrap operation for an
approved test tenant.

Use only repository commands and workflows that have been validated for the current
branch. Do not infer a staging or production tenant from historical scripts, and do
not deploy production outside the protected release workflow.

The protected deploy jobs run secretless/offline validation first, then authenticated
official Forge lint immediately before deploy. Local `pnpm validate` remains useful
and authoritative for pull-request readiness when a contributor has no Forge
credentials.

See [CLAUDE.md](CLAUDE.md) for project operating rules and
[CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow.

## Privacy

Public files must not contain real customer tenant names, page titles or IDs, cloud
IDs, credentials, authenticated browser state, or board bodies. Use synthetic
fixtures and placeholders such as `example.atlassian.net`.

## License

See [LICENSE.md](LICENSE.md) for the repository license terms.
