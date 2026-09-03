# Forge Environments

This repository deploys one existing Forge app. Environment names select deployment
state; they never select a replacement app identity.

## Identity invariant

- App ID: `368b610d-bac1-4e2a-9311-6ec0adca5e49`
- Macro key: `whiteboard`
- Scope: `storage:app`

Do not run `forge register`, replace the app ID, or rewrite the manifest in a deploy
workflow.

## Credentials and validation

Forge CLI authentication uses `FORGE_EMAIL` and `FORGE_API_TOKEN`. Installation also
requires an explicitly supplied approved test site; normal staging and production
delivery never installs or upgrades the app.

`pnpm validate` is credential-free. Its pinned structural manifest check is narrower
than authenticated Forge CLI lint. Staging and production deploy jobs run the
environment-explicit Forge lint immediately before deploy.

## GitHub environments

| Environment | Purpose | Required configuration |
|---|---|---|
| `staging-tldraw` | Lint and deploy the tested main SHA | Allow only `main`; `FORGE_EMAIL` variable; credential available to the deploy step |
| `production-tldraw` | Supply the existing production Forge credential | Allow release tags; no reviewer gate; `FORGE_EMAIL` variable and `FORGE_API_TOKEN` secret |

The production environment remains because its existing secret cannot be copied out
through GitHub APIs. It is a credential scope, not an additional authorization step.
Publishing the generated draft is the production authorization, matching `conf-app`.

The staging reusable workflow receives its token through the default-branch-only
caller because a called workflow did not receive the environment secret in the
measured repository configuration. The production job is a normal release-workflow
job, so its environment supplies the production secret directly. Both jobs expose
credentials only to the presence guard and Forge deploy step, and logs report only
presence—not values, lengths, or prefixes.

## Deploy versus install

Normal delivery runs authenticated Forge lint followed by `forge deploy`. It never
runs `forge install`, upgrades a tenant, creates another listing lineage, changes the
macro key, or clears KVS.

Installation and upgrade are separately named bootstrap operations for a specifically
approved test tenant. Never infer a tenant from scripts, documentation, browser
history, or credentials.

## Privacy

Do not put tenant hostnames, page IDs, cloud IDs, user identifiers, board content,
credentials, or authenticated browser state in this repository, workflow input,
release body, or public log. UI evidence stays in approved private storage.
