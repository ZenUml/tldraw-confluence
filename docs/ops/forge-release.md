# Forge Release Process

Whiteboard follows the same release authorization model as `conf-app`.

## Pull requests and staging

Every branch push and pull request runs `Build and Unit Test`. The job receives no
Forge credentials and runs `pnpm validate` with the repository-pinned structural
manifest validator.

A successful push to `main` calls the `staging-tldraw` workflow. It checks out and
rebuilds the exact SHA, confirms it is still the current main tip, runs authenticated
Forge lint, and deploys the existing app to Forge staging. It never installs or
upgrades the app and never changes its identity or manifest.

## Draft creation

After the main staging job succeeds, the same main workflow automatically creates one
draft release, matching `conf-app`:

- tag and name: `vYYYY.MM.DDHHMM-tldraw`;
- target: the exact commit tested and staged by that run;
- state: draft;
- initial body: a generated placeholder.

The draft job has no GitHub environment and no reviewer gate. It does not publish or
deploy production. Before publication, `release-app` replaces the placeholder with
privacy-safe notes derived from the release delta and asks the user to confirm that
exact tag and SHA.

## Production

Publishing the stable draft emits the `released` event and is the production
authorization, as in `conf-app`. The `Release` workflow checks out the published tag,
runs the full validation, verifies that the existing Forge credential resolved, runs
authenticated Forge lint, and deploys the existing app to Forge production.

The `production-tldraw` environment is retained only because it owns the existing
Forge production credential. It has no reviewer gate. The release workflow never
runs `forge install`, rewrites the manifest, registers an app, or deploys Cloudflare.

After deploy, `release-app` immediately runs the approved production PVT and the
delta-driven `spot-check`. A failed deploy or PVT is reported; rollback, unpublishing,
or a second deploy is never automatic.

## Rollback

Restore the last-known-good behavior as a new commit, pass main staging again, and
publish its newly generated draft. Do not move an existing tag, replace the Forge app
identity, clear KVS, or deploy a historical manifest that omits irreversible storage
declarations.
