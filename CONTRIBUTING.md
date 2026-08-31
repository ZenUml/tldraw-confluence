# Contributing

Contributions are welcome through pull requests to
[`ZenUml/tldraw-confluence`](https://github.com/ZenUml/tldraw-confluence).

## Before changing code

1. Read [CLAUDE.md](CLAUDE.md) and the relevant file under
   [`docs/policies/`](docs/policies/).
2. Start a focused feature branch from an up-to-date `main`; never commit product
   work directly to `main`.
3. Check `git status`. If the checkout contains work you did not create, preserve it
   and use a separate worktree instead of stashing, restoring, or cleaning it.
4. Keep one change of concern per pull request.

New user-visible behavior must define its analytics events—name, trigger, and typed
properties—before runtime implementation begins. WP1 is operational scaffolding and
does not add product events.

## Local validation

Install and validate from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm validate
```

Run narrower commands while developing, but run the complete contract before
submitting a pull request. WP1's Playwright command only collects a non-product
sentinel. Do not report it as an E2E or UI pass.

`pnpm validate` is secretless/offline after installation. It includes deterministic
manifest structure checks from `pnpm validate:manifest`, which uses the pinned
internal `@forge/manifest` package. That validator is narrower than the official
Forge CLI lint. Do not add Forge credentials to pull-request jobs: official
`pnpm forge:lint` runs separately on a credentialed developer machine or in the
protected staging/production job immediately before deploy. On a new CLI environment,
run `pnpm forge:deploy:disable-analytics` once before the lint command.

If a change affects visible behavior, provide real Forge UI evidence or a relevant
resolver/network intercept. Unit tests and collection output alone do not satisfy a
UI assertion. If no approved fixture is available, mark the UI check `SKIPPED` or
`BLOCKED` with the reason.

## Pull request notes

Every pull request should state:

- the user or operational outcome;
- validation commands and their actual results;
- whether UI evidence is `PASS`, `FAIL`, `SKIPPED`, or `BLOCKED`;
- any impact on Forge identity, permissions, KVS keys, or stored values;
- whether a staging or production release is required.

Process-only WP1 changes must report UI validation as
`SKIPPED — no runtime change`, never as `PASS`.

The WP1 shared-lock decision allows exactly three `static/spa` build-graph
convergences: `jest-worker > @types/node` 18.11.9 to 22.13.9,
`randombytes > safe-buffer` 5.1.2 to 5.2.1, and the new
`@types/node@22.13.9 > undici-types@6.20.0` edge. Any other product/runtime
resolution change requires a later scoped work package rather than an expanded WP1
allowlist.

## Privacy and test data

Follow [the client-privacy policy](docs/policies/client-privacy.md). Public commits
must use synthetic data and placeholder tenant details. Never commit credentials,
auth state, customer board content, complete Forge context, or screenshots that
identify a customer.

## Runtime safety

The Forge app ID, `whiteboard` macro key, permissions, legacy KVS key derivation,
and stored values are compatibility contracts. Read
[the persistence-safety policy](docs/policies/persistence-safety.md) before touching
load, save, document conversion, or assets.
