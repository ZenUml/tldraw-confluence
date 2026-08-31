# Forge Release Process

WP1 establishes a safe delivery structure without activating production.

## Pull request validation

Every pull request reports the stable `Build and Unit Test` check. It runs a frozen install followed by `pnpm validate` and receives no Forge or browser credentials. The validation chain uses the local `@forge/manifest` parser to reject error-level manifest findings without authentication. That structural check is narrower than the authenticated Forge CLI `forge lint`; it does not replace the CLI's complete source and permission analysis.

WP1 Playwright validation proves test discovery only. It is not product E2E evidence and cannot justify a runtime UI PASS.

## Staging

A successful push to `main` runs the same validation and then calls the protected `staging-tldraw` deployment workflow. Staging has no feature-branch or manual-dispatch entry point: unmerged code cannot request its credentials.

Staging checks out and rebuilds the exact SHA, serializes Forge deployments, and verifies that the commit is still the default-branch tip immediately before deployment. Its `pnpm validate` step remains credential-free. Only the protected deployment step receives `FORGE_EMAIL` and `FORGE_API_TOKEN`; that one step runs authenticated `pnpm forge:lint && pnpm forge:deploy:tldraw:staging`, so a lint failure prevents deployment. It deploys the existing Forge app without installing it or rewriting its manifest, then uploads the manifest and frontend build as CI evidence.

## UI evidence and draft releases

Until WP2 supplies a trusted browser journey, draft creation is manual and protected:

1. An operator inspects the staged Whiteboard UI and retains the evidence in approved private storage.
2. They calculate its SHA-256 without publishing its tenant/page location.
3. They dispatch `Prepare Draft Release` with the exact main SHA, successful main CI run ID, and evidence hash.
4. The workflow verifies that the run deployed that SHA successfully.
5. A reviewer on `staging-tldraw-release` confirms the private evidence before the draft is created.

The draft tag is `vYYYY.MM.DDHHMM-tldraw`, pinned to the tested SHA. Its public body contains only the CI run ID and evidence hash.

There is no branch-only staging entry point. Draft preparation requires a successful main-push staging run.

## Production

Publishing a draft as a stable release triggers `release.yml`; prereleases are rejected. Production fails closed unless both repository gates are true and the tag matches the Whiteboard format. Its credential-free preflight also requires the exact two-line staged-run/evidence contract created by `Prepare Draft Release`, verifies that the tag commit remains on `main`, and rechecks that the referenced main run deployed that same SHA successfully. The verified commit SHA—not the movable tag name—is then passed to the serialized deploy job, which waits at protected environment `production-tldraw` and rechecks the gates, stable-release state, tag mapping, and main ancestry after approval.

WP1 intentionally leaves `TLDRAW_PRODUCTION_RELEASE_ENABLED` unset and labels the production path `STRUCTURAL ONLY / UNVALIDATED`. Do not publish a release during WP1. WP2 must add the production fixture and PVT path before the gate can be enabled.

The WP1 release body is a reviewed pointer, not immutable provenance. Before enabling
production, WP2 must bind the UI evidence to a workflow-generated immutable artifact
or attestation and verify it during deployment.

Normal production delivery:

- checks out and rebuilds the verified release commit SHA;
- reruns credential-free `pnpm validate`;
- injects Forge credentials only into the protected deployment step, which runs authenticated `pnpm forge:lint && pnpm forge:deploy:tldraw:production` so lint must pass before deployment;
- deploys the existing app ID;
- never runs `forge install`;
- never rewrites the manifest or deploys Cloudflare.

## Rollback

WP1 changes delivery infrastructure only. To roll it back, restore the last-known-good source on `main` as a new commit, then repeat main staging, UI evidence, draft, and stable-release promotion for that exact commit. Do not redeploy an old tag outside the provenance gate, replace the Forge app identity, or clear KVS. Later forward-only document migrations define their own emergency release path before activation.
