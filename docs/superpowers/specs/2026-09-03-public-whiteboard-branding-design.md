# Public Whiteboard Naming Design

**Status:** Approved by the user on 2026-09-03

**Repository:** `ZenUml/tldraw-confluence`

**Parent design:**
`docs/superpowers/specs/2026-08-31-tldraw-confluence-renovation-design.md`

## Objective

Present the existing Forge app as **Whiteboard for Confluence** everywhere customers
encounter its product name. Remove the obsolete brand-approval release gate and its
supporting workflow, skill, test, and documentation contracts. Preserve the complete
drawing experience and every installation and storage identity.

## Decision

The product no longer uses Tldraw as a public brand. Its public name is
**Whiteboard for Confluence**. Public product naming is a fixed repository contract,
not a separately configurable approval state.

The application continues to use the tldraw SDK as an implementation dependency.
References that accurately identify the SDK, repository, package, build command,
environment, release tag, debug key, or existing integration contract are technical
identifiers rather than product branding and remain unchanged.

## Scope

Implementation removes the obsolete brand-approval gate from:

- the production release workflow and its preflight/recheck logic;
- the `release-app` lifecycle skill;
- workflow and skill contract tests;
- current operations documentation; and
- programme and implementation-plan text that otherwise instructs operators to set
  or verify the obsolete gate.

Implementation also changes the customer-facing name in:

- the existing Forge manifest macro title; and
- the existing Atlassian Marketplace listing.

The Marketplace change modifies the existing listing only. It must not create a new
listing or app lineage and remains separately approval-gated immediately before the
external edit.

## Preserved technical identifiers

The removal of public Tldraw branding must not mechanically rename identifiers whose
stability is part of the application or delivery contract. Preserve:

- repository identity `ZenUml/tldraw-confluence`;
- the `@tldraw/tldraw` package and `Tldraw` React component while that SDK remains the
  drawing engine;
- internal product/build identifier `tldraw`;
- existing `forge:*:tldraw:*` commands;
- GitHub environment names and concurrency groups containing `tldraw`;
- the `vYYYY.MM.DDHHMM-tldraw` release-tag contract;
- package names, fixture metadata, dependency baselines, and debug storage keys that
  identify the SDK or existing technical interface.

These names are not rendered as the Whiteboard product name. Removing or migrating
them would be a separate compatibility change and is outside this work.

## Identity and persistence invariants

The work must not change:

- Forge app ID `368b610d-bac1-4e2a-9311-6ec0adca5e49`;
- macro key `whiteboard`;
- `storage:app` scope;
- resource and resolver keys;
- the legacy KVS key derived from the final segment of `context.localId`;
- stored Whiteboard values or document formats;
- the existing Marketplace listing identity or installation lineage; or
- the drawing, editing, saving, loading, resizing, and rendering behavior.

No replacement Forge app or Marketplace listing may be created.

## Production release behavior

The release workflow retains the explicit production-release enable switch and all
general release-safety controls: exact-SHA staging provenance, freshness, release
lineage, protected production review, production fixture, PVT, and UI evidence.

It no longer reads or checks a separate brand-approval variable. Instead, repository
validation asserts the fixed public name in `manifest.yml`. Production already runs
the complete repository validation contract against the release tag before deploy,
so a manifest naming regression fails the same exact-SHA release validation as any
other repository contract violation.

Marketplace naming is verified operationally before the production-release enable
switch may be turned on. It is not represented by another mutable boolean, custom
attestation, Marketplace credential, or page-scraping step in CI. The normal release
evidence and immutable-provenance work remains required independently; this design
does not weaken or replace it.

## Delivery order and session isolation

The implementation uses an isolated worktree from current `main`. It must not copy,
commit, overwrite, or otherwise absorb changes from the active WP2 runtime worktree.
That worktree also modifies `manifest.yml`, so integration must preserve both owners'
intent and must not reset, restore, stash, or clean either worktree.

Delivery proceeds in this order:

1. Update repository tests to reject the obsolete brand gate and require the fixed
   Whiteboard public name.
2. Remove the workflow, skill, and documentation gate contracts.
3. Change only the manifest's customer-facing title.
4. Run the full repository validation contract and confirm identity/storage paths are
   unchanged.
5. Submit and merge through the normal branch lifecycle.
6. Obtain exact-SHA staging UI evidence that the Whiteboard still renders and edits.
7. Request separate explicit approval immediately before renaming the existing
   Marketplace listing.
8. Re-read the existing listing after the edit and record privacy-safe evidence.

## Analytics and privacy

No product analytics event is added. The work changes naming and release
configuration only; it introduces no new user action, runtime outcome, persistence
behavior, or error state.

Public commits and release notes contain no tenant hostname, page title or ID, cloud
ID, credential, authenticated browser state, board body, or identifying screenshot.
UI evidence remains in approved private storage and is referenced publicly only by a
privacy-safe digest.

## Verification

Repository validation must prove:

- no workflow, skill, test, or current operator instruction refers to the obsolete
  brand-approval variable;
- the manifest has exactly one `whiteboard` macro titled `Whiteboard for Confluence`;
- the tldraw SDK dependency and drawing component remain present;
- the Forge app ID, macro key, `storage:app` scope, resource/resolver keys, and runtime
  remain unchanged;
- no persistence or document-format path changes;
- `pnpm validate` passes;
- the authoritative `Build and Unit Test` job passes for the exact PR head; and
- the exact merged SHA passes `Build and Unit Test` and Forge staging deployment.

UI validation must observe the exact staged SHA and record:

- the Whiteboard macro is available under `Whiteboard for Confluence`;
- an existing approved synthetic Whiteboard renders in view and edit mode;
- a reversible synthetic drawing interaction works without changing storage identity;
- the old customer-facing product name is absent from the tested macro surface; and
- any permitted fixture mutation and cleanup are recorded.

After separate Marketplace-edit approval, read-only verification must show that the
existing listing ID uses `Whiteboard for Confluence`.

## Failure and rollback

If repository validation or staging UI evidence fails, do not edit the Marketplace
listing and do not enable production release.

If the manifest ships but the Marketplace edit cannot be completed, production
release remains disabled and the inconsistent surfaces are reported. Any rollback is
a normal feature-branch change; do not register a replacement app, create another
listing, rewrite release tags, or alter stored Whiteboard data.

If the Marketplace title is changed and post-edit verification fails, stop and
request direction. Do not automatically rename, delete, or recreate the listing.

## Completion criteria

This item is complete only when:

- the obsolete brand-approval gate and its repository contracts are removed;
- the manifest and existing Marketplace listing both use `Whiteboard for Confluence`;
- exact-SHA validation and staging UI evidence confirm the drawing experience remains
  functional;
- identity and persistence invariants pass; and
- the evidence register records the completed result while production release remains
  disabled until every unrelated production prerequisite closes.
