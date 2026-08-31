# Forge Environments

This repository deploys one existing Forge app. Environment names select deployment state; they never select a different app ID.

## Identity invariant

- App ID: `368b610d-bac1-4e2a-9311-6ec0adca5e49`
- Macro key: `whiteboard`
- Scope: `storage:app`

Do not run `forge register`, replace the app ID, or rewrite the manifest in a deployment workflow.

## Local development

Forge CLI authentication uses these environment variable names:

- `FORGE_EMAIL`
- `FORGE_API_TOKEN`

An installation command also requires an explicitly supplied site such as `example.atlassian.net`. Keep the real site in an ignored local environment file or pass it on the command line. Never commit it.

Local preflight may inspect authentication, environments, installations, and tunnel help. Deployment, installation, upgrade, tunnel startup, and process termination are state-changing steps and require an explicit operation.

`pnpm validate` is designed to run without Forge credentials. Its offline manifest check uses `@forge/manifest` and fails on error-level structural findings. This is not the complete Forge CLI `forge lint`: authenticated staging and production deployment steps run `pnpm forge:lint` immediately before `forge deploy`.

## GitHub environments

| Environment | Purpose | Required configuration |
|---|---|---|
| `staging-tldraw` | Lint and deploy the tested SHA to Forge staging | Allow only `main`; `FORGE_EMAIL` variable and `FORGE_API_TOKEN` secret, both exposed only to the lint-and-deploy step |
| `staging-tldraw-release` | Human approval that private UI evidence matches the staged main SHA | Allow only `main`; required reviewer; prevent self-review |
| `production-tldraw` | Lint and deploy an approved release commit | Allow only `v*-tldraw` tags; required reviewer; prevent self-review; `FORGE_EMAIL` variable and `FORGE_API_TOKEN` secret exposed only to the lint-and-deploy step |

Before merging the workflow branch, create all three environments and configure
the exact deployment branch/tag restrictions, required reviewers, and prevention of
self-review listed above.
Protect `main` with the authoritative `Build and Unit Test` check after that check has
run on the Draft PR. Do not merge while these controls are absent.

A read-only audit on 2026-08-31 found zero GitHub environments, zero repository-level
Actions variables/secrets, and no `main` branch protection or ruleset in the remote repository.
That is an external configuration blocker for merge and live staging, not a reason to
weaken the checked-in workflows. The staging reusable workflow deliberately has no
`workflow_dispatch` trigger, so feature-branch code cannot request environment
credentials while those protections are being established.

Repository-level variables gate production before the protected deployment job starts:

- `TLDRAW_BRAND_APPROVED=true`
- `TLDRAW_PRODUCTION_RELEASE_ENABLED=true`

`TLDRAW_PRODUCTION_RELEASE_ENABLED` must remain unset during WP1. WP2 may enable it only after an approved production fixture and automated PVT path exist.

Before production can be enabled, replace the WP1 release-body evidence pointer with
an immutable, workflow-verifiable evidence artifact or attestation. The current
manual hash/reviewer gate is sufficient only while production is disabled.

## Deploy versus install

Normal staging and production delivery runs authenticated `forge lint` followed by `forge deploy`. Deployment is its only state-changing Forge operation; it never installs or upgrades the app on a tenant.

Installation is a separately named bootstrap operation for an approved test tenant. The caller must supply the site explicitly. No production tenant is inferred from the repository's legacy scripts, and no production validation tenant has been verified in WP1.

## Privacy

Do not put real tenant hostnames, page IDs, cloud IDs, user identifiers, or board content in this public repository, workflow input, release body, or log. UI evidence stays in approved private storage; public workflow metadata may record only its SHA-256.
