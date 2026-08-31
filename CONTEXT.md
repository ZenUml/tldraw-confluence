# Confluence Whiteboard context

## Stable terminology

**Whiteboard macro**

The Confluence Forge macro whose manifest key is `whiteboard`. Use this in product and
domain prose.

**`tldraw`**

The repository, internal product/build identifier, and SDK family name. Do not use it
as a replacement for the neutral product term when the distinction matters.

**Forge app identity**

The existing Forge app ID, macro key, permissions, and installation lineage. These
remain stable throughout renovation and the later `conf-app` merge.

**Legacy KVS key**

The final segment of Forge `context.localId`. Current Whiteboard values are looked up
through this key in the app-scoped Forge KVS namespace.

**Legacy raw document**

A stored tldraw v1-shaped object accepted directly by the current frontend when it
has a truthy `id`. The checked-in seed document has `version: 15.5`; the current
loader does not validate a complete schema.

**Legacy compressed envelope**

An object with a truthy `compressedJson` property. The payload is LZUTF8 Base64 text
that the current frontend decompresses and parses as JSON.

**Unsupported residue**

A stored value that cannot safely be treated as a Whiteboard document, including
arrays written by obsolete resolver operations. Unsupported is not the same as
missing.

**Viewport**

The current app's top-level document field containing persisted Whiteboard height.
Camera and selection state remain part of the legacy page-state structure.

**Asset-bearing legacy document**

A legacy document whose `assets` map is non-empty. Current runtime disables assets
and clears the in-memory asset map after load. The WP2 target is to fail closed rather
than make such a document editable or overwrite it.

**Modern KVS slot**

A planned, version-prefixed key for a modern tldraw snapshot. It does not exist in
WP1. Its exact key and schema belong to the WP5 child design.

**Collection sentinel**

The sole WP1 Playwright test. It proves config/spec discovery only and carries no
product UI evidence.

## Relationships

- One macro instance resolves one legacy KVS key from its Forge context.
- That key may contain a legacy raw document, a legacy compressed envelope, an
  unsupported value, or no value.
- The frontend loads the document and persists resize state in its top-level
  `viewport` field.
- The modern slot, modern SDK, Vite build, and `PRODUCT_TYPE=tldraw` variant are
  future milestones, not current runtime behavior.

## Programme boundaries

- **WP1:** toolchain, validation, guidance, skills, CI, and delivery scaffolding;
  zero product UI assertions and no runtime behavior changes.
- **WP2:** typed legacy decoding, load/save state, ordered writes, privacy-safe
  diagnostics, synthetic fixtures, and the first real Forge browser journey.
- **WP3:** CRA-to-Vite equivalence while retaining tldraw v1 and KVS contracts.
- **WP4:** Forge platform SDK and supported Custom UI configuration convergence.
- **WP5:** licensed modern SDK, explicit conversion, and modern KVS slot.
- **WP6:** import the proven standalone Whiteboard as an isolated `conf-app` variant.

Target-state rule: `missing`, `read-error`, `invalid`, and `unsupported` are distinct.
Only confirmed `missing` may create a new board. This is a WP2 invariant, not a claim
about the WP1 runtime.

## Avoid

- Calling a Forge KVS value “custom content”.
- Calling `playwright test --list` an E2E or UI pass.
- Calling the checked-in seed document a verified empty board.
- Treating an unsupported or failed read as missing.
- Describing the modern slot or `conf-app` variant as already implemented.

See the
[approved renovation design](docs/superpowers/specs/2026-08-31-tldraw-confluence-renovation-design.md)
for the full programme.
