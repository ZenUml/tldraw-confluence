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

`pnpm validate` is designed to run without Forge credentials. Its offline manifest
check uses `@forge/manifest` and fails on error-level structural findings. This is not
the complete Forge CLI `forge lint`: authenticated staging and production deployment
steps switch only the Forge CLI segment to Node 20, disable analytics once, run raw
`pnpm forge:lint:tldraw:staging` or `pnpm forge:lint:tldraw:prod`, then run the raw
environment deploy script. The environment must be explicit: bare `forge lint` falls
back to the CLI's default development environment setting, which does not exist on a
fresh CI runner, and the CLI then tries to prompt.

## GitHub environments

### Where the production gate variables must live

`TLDRAW_PRODUCTION_RELEASE_ENABLED` and `TLDRAW_BRAND_APPROVED` must be set at **repository** scope.

`release.yml` reads them from two jobs with different scopes:

- job `preflight` declares no `environment`, so `vars.*` resolves at repository scope only;
- job `deploy` declares `environment: production-tldraw`, so an environment variable of the same name
  would take precedence over the repository one.

Setting them on the environment instead makes `preflight` see empty values and report
"Production release is disabled until PVT is implemented and approved", which reads like a policy
decision rather than a scoping mistake. Both mismatch directions currently fail closed, so production
stays blocked either way; the cost is a misleading message, not an unsafe deploy.

A contract test pins `preflight.environment` as undefined, so the asymmetry cannot be removed by
accident on the workflow side. GitHub-side variable scope is not visible to a unit test, which is why
it is written down here.


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

### Implemented state, 2026-08-31

All three environments now exist and carry the deployment restrictions above:
`staging-tldraw` and `staging-tldraw-release` allow only `main`; `production-tldraw` allows only
`v*-tldraw` tags. `staging-tldraw-release` and `production-tldraw` each require a review, and
`production-tldraw` holds a `FORGE_EMAIL` variable and a `FORGE_API_TOKEN` secret.

Two controls from the table above are still open, and both need a decision that configuration alone
cannot supply:

- **Prevent self-review is off.** Only one reviewer is registered. Turning it on with a single
  reviewer produces a gate nobody can pass. It needs a second reviewer identity first.
- **`main` has no branch protection.** The authoritative `Build and Unit Test` check is not required,
  and direct pushes to `main` are not blocked.

The repository-scoped `FORGE_API_TOKEN` used by staging belongs to an identity that is not a
contributor to the app; see the access boundary section in `pipeline-port-status.md`. It authenticates,
so it proves the credential path, but it cannot deploy.

An earlier read-only audit the same day found zero GitHub environments, zero repository-level
Actions variables/secrets, and no `main` branch protection or ruleset in the remote repository.
That is an external configuration blocker for merge and live staging, not a reason to
weaken the checked-in workflows. The staging reusable workflow deliberately has no
`workflow_dispatch` trigger, so feature-branch code cannot request environment
credentials while those protections are being established.

Repository-level variables gate production before the protected deployment job starts:

- `TLDRAW_BRAND_APPROVED=true`
- `TLDRAW_PRODUCTION_RELEASE_ENABLED=true`

`TLDRAW_PRODUCTION_RELEASE_ENABLED` must remain unset during WP1. WP2 may enable it
only after an approved production fixture, automated PVT, immutable UI provenance,
and an authoritative last-successful-production SHA record exist.

Before production can be enabled, replace the WP1 release-body evidence pointer with
an immutable, workflow-verifiable evidence artifact or attestation. The current
manual hash/reviewer gate is sufficient only while production is disabled.

The normal workflow's release-lineage query protects ordinary stale reruns and
out-of-order approvals, but the GitHub release list and tags are not the production
system of record. Before enabling production, persist each successful production SHA
in a tamper-resistant deployment record or attestation, require that SHA to be an
ancestor of the next candidate, and govern release/tag deletion and mutation.
[GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
are an additional repository control, not a replacement for that deployment record.
The read-only WP1 audit found immutable releases disabled.

## After the app contributor role is granted

Staging cannot succeed until an owner of the Whiteboard app grants a contributor role to the identity
the pipeline uses. Everything else on the path is in place. Once the grant happens, work in this order.

1. **Confirm the identity reaches the app.** With that identity's credentials in the environment:

       forge install list

   A denial here means the grant has not taken effect. `forge environments list` is not a substitute:
   it succeeds without app access and cannot tell the two cases apart.

2. **Match the pipeline credentials to the granted identity.** If it is not the address currently in
   the environment variable, all four values change together:

       gh variable set FORGE_EMAIL --env staging-tldraw --body '<address>' --repo ZenUml/tldraw-confluence
       printf '%s' '<token>' | gh secret set FORGE_API_TOKEN --repo ZenUml/tldraw-confluence
       gh variable set FORGE_EMAIL --env production-tldraw --body '<address>' --repo ZenUml/tldraw-confluence
       printf '%s' '<token>' | gh secret set FORGE_API_TOKEN --env production-tldraw --repo ZenUml/tldraw-confluence

   The staging token is at repository scope, not on the `staging-tldraw` environment. A called workflow
   receives no environment secrets, so the caller must inherit it.

3. **Re-run the newest `main` push of `Build, Test and Stage`.** Require both
   `Build and Unit Test` and `Deploy to Forge Staging` to succeed. The first successful staging deploy
   also creates the app's `staging` environment, which does not exist yet — `forge environments list`
   currently returns only `production`.

4. **Capture Whiteboard UI evidence against that staging deployment.** This is the WP1 gap that has
   never been closed: the bundler migration to Vite and the Forge SDK upgrade are runtime changes that
   no rendered-UI observation covers. A build passing and unit tests passing are not UI evidence.

5. **Only then consider production.** It stays blocked by `TLDRAW_PRODUCTION_RELEASE_ENABLED` and
   `TLDRAW_BRAND_APPROVED`, both unset, and by the branding, fixture, PVT, and approval gates named
   above. Set those two variables at repository scope, never on an environment.

## Deploy versus install

Normal staging and production delivery runs authenticated `forge lint` followed by
`forge deploy`. Deployment is its only state-changing Forge operation; it never
installs or upgrades the app on a tenant. `release-app` preserves this boundary and
cannot enable its own production gates.

Installation is a separately named bootstrap operation for an approved test tenant. The caller must supply the site explicitly. No production tenant is inferred from the repository's legacy scripts, and no production validation tenant has been verified in WP1.

## Privacy

Do not put real tenant hostnames, page IDs, cloud IDs, user identifiers, or board content in this public repository, workflow input, release body, or log. UI evidence stays in approved private storage; public workflow metadata may record only its SHA-256.
