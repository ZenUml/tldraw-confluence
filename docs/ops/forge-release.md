# Forge Release Process

WP1 establishes a safe delivery structure without activating production.

## Pull request validation

Every branch push and pull request runs the stable `Build and Unit Test` check. Push
and PR events for the same branch share a concurrency key, matching `conf-app`'s
deduplication model. The job runs a frozen install followed by `pnpm validate` and
receives no Forge or browser credentials. The validation chain uses the local
`@forge/manifest` parser to reject error-level manifest findings without
authentication. That structural check is narrower than the authenticated Forge CLI
`forge lint`; it does not replace the CLI's complete source and permission analysis.

WP1 Playwright validation proves test discovery only. It is not product E2E evidence and cannot justify a runtime UI PASS.

## Staging

A successful push to `main` runs the same validation and then calls the protected `staging-tldraw` deployment workflow. Staging has no feature-branch or manual-dispatch entry point: unmerged code cannot request its credentials.

Staging checks out and rebuilds the exact SHA, serializes Forge deployments, and
verifies that the commit is still the default-branch tip immediately before
deployment. Its `pnpm validate` step remains credential-free on Node 22.22.3. Only
the protected deployment step receives `FORGE_EMAIL` and `FORGE_API_TOKEN`; the Forge
CLI segment switches to Node 20, disables analytics once, runs authenticated
`pnpm forge:lint`, then runs the raw staging deploy script. A lint failure prevents
deployment. It deploys the existing Forge app without installing it or rewriting its
manifest, then uploads the manifest and frontend build as CI evidence.

## UI evidence and draft releases

Until WP2 supplies a trusted browser journey, draft creation is manual and protected:

1. An operator inspects the staged Whiteboard UI and retains the evidence in approved private storage.
2. They calculate its SHA-256 without publishing its tenant/page location.
3. They dispatch `Prepare Draft Release` with the exact main SHA, successful main CI run ID, and evidence hash.
4. The workflow verifies that the run deployed that SHA successfully.
5. A reviewer on `staging-tldraw-release` confirms the private evidence before the draft is created.

The draft tag is `vYYYY.MM.DDHHMM-tldraw`, pinned to the tested SHA. Its public body
begins with exactly the CI run ID and evidence hash. `release-app` may preserve that
header and must append a non-empty, privacy-safe `## Changes` section derived from
the release delta. A maintenance-only release says so explicitly.

There is no branch-only staging entry point. Draft preparation requires a successful main-push staging run.

## Production

Publishing a draft as a stable release emits the `released` event consumed by
`release.yml`; prereleases are not accepted. Production fails closed unless both
repository gates are true and the tag matches the Whiteboard format. Its
credential-free preflight requires the staged-run/evidence header created by
`Prepare Draft Release`, requires a non-empty `## Changes` section after that header,
requires both the tag-format timestamp and referenced staging completion to be
fresh, binds the candidate to the release event's exact SHA, verifies that the tag
commit remains on `main`, requires the previous published Whiteboard release SHA to
be its ancestor, and rechecks that the referenced main run deployed that same SHA
successfully. GitHub release `created_at` is deliberately not used for Draft age
because [GitHub defines it as the release commit's date, not the drafting
time](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28). The
tag timestamp is a fail-closed workflow contract backed by the fresh staging-run
check; it is not a GitHub attestation of when a Draft was created. The
verified commit SHA—not the movable tag name—is then passed to the serialized deploy
job, which waits at protected environment `production-tldraw` and rechecks the gates,
stable-release state, publication age, tag mapping, newest-release lineage, and main
ancestry after approval. Preflight carries the earliest 24-hour expiry of the staging
completion, tag timestamp, and publication across that wait, so stale approval
cannot extend freshness. Publishing and the protected-environment reviewer are two
independent authorization boundaries; publication never authorizes an agent to
approve or bypass the second gate.

WP1 intentionally leaves `TLDRAW_PRODUCTION_RELEASE_ENABLED` unset and labels the production path `STRUCTURAL ONLY / UNVALIDATED`. Do not publish a release during WP1. WP2 must add the production fixture and PVT path before the gate can be enabled.

The protected draft workflow signs a canonical staging-evidence statement with
GitHub artifact attestations. Production reconstructs it from the exact SHA,
staging-run ID, and private evidence hash, then verifies its digest and signer.

The two release-lineage checks close normal stale-rerun and approval-order races.
Repository immutable releases govern release/tag mutation. Each successful protected
production job signs a canonical SHA ledger; the next release verifies the ledger for
the latest successful `production-tldraw` deployment and requires that SHA to be its
ancestor. The first release is the sole no-ledger bootstrap and creates that record.

Normal production delivery:

- checks out and rebuilds the verified release commit SHA;
- reruns credential-free `pnpm validate`;
- injects Forge credentials only into the protected deployment step, switches only
  the Forge CLI to Node 20, disables analytics once, runs authenticated
  `pnpm forge:lint`, then `pnpm forge:deploy:tldraw:prod`;
- deploys the existing app ID;
- never runs `forge install`;
- never rewrites the manifest or deploys Cloudflare.

The adapted `release-app` skill owns the same post-staging handoff as `conf-app`:
select the exact draft, derive notes and focused checks from one commit delta, request
explicit publication confirmation, watch the exact production run, invoke mandatory
PVT, then invoke the delta-driven `spot-check`. In WP1 it stops at
`BLOCKED — production release disabled in WP1` before any mutation.

## Rollback

WP1 changes delivery infrastructure only. To roll it back, restore the last-known-good source on `main` as a new commit, then repeat main staging, UI evidence, draft, and stable-release promotion for that exact commit. Do not redeploy an old tag outside the provenance gate, replace the Forge app identity, or clear KVS. Later forward-only document migrations define their own emergency release path before activation.

The normal release workflow is monotonic and rejects a candidate whose predecessor
is not an ancestor. A history-divergent or old-tag rollback needs a separately
designed and authorized rollback path; it is never disguised as a normal release.
