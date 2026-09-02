# Public Whiteboard Branding Design

**Status:** Approved by the user on 2026-09-03

**Repository:** `ZenUml/tldraw-confluence`

**Parent design:**
`docs/superpowers/specs/2026-08-31-tldraw-confluence-renovation-design.md`

## Objective

Close the production branding gate by presenting the existing Forge app as
**Whiteboard for Confluence** wherever customers encounter its product name. Preserve
the installed app, macro, storage, and release identities.

The Marketplace listing currently uses “Tldraw whiteboard on Confluence,” and the
Forge manifest uses the same customer-facing title. No written trademark permission
to retain that public name is recorded. Internal references that identify the SDK,
repository, release route, or existing build contract remain `tldraw`.

## Decision

Use **Whiteboard for Confluence** as the public product name.

Two alternatives were considered and rejected:

- Retaining the current public name would depend on obtaining and maintaining written
  trademark permission.
- Renaming only the Marketplace listing would leave the installed macro and public
  listing inconsistent.

The neutral name follows the repository's approved domain language and removes the
production release's dependency on unrecorded trademark permission.

## Identity and persistence invariants

Branding work must not change:

- Forge app ID `368b610d-bac1-4e2a-9311-6ec0adca5e49`;
- macro key `whiteboard`;
- `storage:app` scope;
- resource and resolver keys;
- the legacy KVS key derived from the final segment of `context.localId`;
- stored Whiteboard values or document formats;
- the Marketplace listing lineage;
- internal repository, package, workflow, environment, tag, or product identifiers
  whose contract is `tldraw`.

No replacement Forge app or Marketplace listing may be created.

## Customer-facing surfaces

The implementation changes only the following product-name surfaces:

1. The existing manifest macro title becomes `Whiteboard for Confluence`.
2. The existing Marketplace listing title becomes `Whiteboard for Confluence`.
3. Marketplace prose is reviewed only for direct uses of the old product name. SDK
   attribution remains accurate where it describes the underlying tldraw SDK.

Repository prose continues to use **Whiteboard** for the product and `tldraw` only
for SDK, repository, tag, environment, package, or compatibility identities.

## Delivery boundaries

Implementation starts in an isolated worktree from current `main`. It must not copy,
commit, overwrite, or otherwise absorb changes from the active WP2 runtime worktree.
Because that worktree also modifies `manifest.yml`, the branding branch must wait for
the owning session to reach a durable state before integration, then rebase or merge
normally and resolve any overlap by preserving both changes' intent.

The code change and the Marketplace edit remain separate authorization boundaries:

1. Add a repository contract for the approved public name.
2. Change the manifest title without changing identity, permissions, storage, or
   runtime behavior.
3. Run `pnpm validate` and authenticated Forge lint through the normal delivery path.
4. Submit and ship the code change through a feature-branch pull request.
5. Observe the staged macro surface and retain privacy-safe UI evidence.
6. Request separate explicit approval immediately before editing the existing public
   Marketplace listing.
7. Re-read both the listing and deployed macro surface after the edit.
8. Set repository variable `TLDRAW_BRAND_APPROVED=true` only when both surfaces show
   the approved name and the evidence register records that result.

The variable is an attestation of completed evidence, not a switch used to bypass
unfinished branding work. The production-release enablement variable remains unset.

## Analytics and privacy

No product analytics event is added. The change alters naming only; it introduces no
new user action, runtime outcome, storage behavior, or failure mode.

Public commits and release notes contain no tenant hostname, page title or ID, cloud
ID, credential, authenticated browser state, board body, or identifying screenshot.
UI evidence stays in approved private storage and is referenced publicly only by a
SHA-256 digest.

## Verification

Repository validation must prove:

- the manifest has exactly one `whiteboard` macro titled `Whiteboard for Confluence`;
- the Forge app ID, macro key, `storage:app` scope, resource/resolver keys, and runtime
  remain unchanged;
- no guarded persistence or document-format path changes;
- `pnpm validate` passes;
- the authoritative `Build and Unit Test` job passes for the exact PR head;
- the exact merged SHA passes `Build and Unit Test` and Forge staging deployment.

UI validation must observe the exact staged SHA and record:

- the Whiteboard macro remains available under the approved public name;
- an existing synthetic Whiteboard still renders in view and edit mode;
- the old customer-facing product name is absent from the tested macro surface;
- no page or board content is persisted during the check.

After separate Marketplace-edit approval, read-only verification must show that the
existing listing, rather than a replacement listing, uses the approved name.

## Failure and rollback

If repository validation or staging UI evidence fails, do not set the branding gate
and do not edit the Marketplace listing.

If the manifest ships but the Marketplace edit cannot be completed, leave
`TLDRAW_BRAND_APPROVED` unset and report the inconsistent surfaces. A later normal
feature-branch change may revert the manifest title if the owner decides consistency
is more important than retaining the staged rename. Do not register a replacement
app, create a second listing, rewrite release tags, or alter stored Whiteboard data.

If the Marketplace title is changed and post-edit verification fails, stop and
request direction. Do not automatically rename, delete, or recreate the listing.

## Completion criteria

The branding blocker is closed only when:

- the manifest and existing Marketplace listing both use `Whiteboard for Confluence`;
- exact-SHA staging UI evidence is recorded;
- identity and persistence invariants pass repository validation;
- the evidence register records the completed checks; and
- `TLDRAW_BRAND_APPROVED` is exactly `true` at repository scope.

