# WP2 Data Safety and Behavioral Baseline — Child Design

**Status:** Approved by the user on 2026-09-03. The user's direct-completion instruction authorizes implementation without another staged approval loop.

**Parent:** [Tldraw for Confluence Renovation Design](./2026-08-31-tldraw-confluence-renovation-design.md)

**Implementation base:** `main` after the approved public Whiteboard naming release, commit `c2748287a3b33149da30c32f9fcdf4525d3ac4df`

## 1. Outcome and boundaries

WP2 makes the existing Vite + React 18 + `@tldraw/tldraw@1.26.2` application safe to load and save before the editor SDK changes. The previously completed Vite and focused Forge-runtime convergence remain fixed inputs rather than work repeated by WP2.

WP2 delivers:

- a precompiled pure typed legacy-codec package;
- explicit missing, readable, unsupported, invalid, and read-error states;
- a Forge KVS adapter and conditional write journal that preserve the existing app identity, macro key, scope, legacy key, and stored-value compatibility;
- a frontend load/save state machine with ordered writes and visible retry;
- privacy-safe logs, typed lifecycle analytics, and visible build identity;
- synthetic fixtures, unit/contract coverage, and the first real-Forge behavioral E2E journeys;
- the `check-version`, `spot-check`, and PVT skill updates unlocked by build identity and the new UI states.

WP2 does not:

- upgrade tldraw, React, Vite, or the removed macro configuration UI;
- upgrade the already-pinned Forge runtime packages; WP2 adds only the focused storage dependency `@forge/kvs@1.2.5`;
- write a modern tldraw snapshot or modern KVS slot;
- accept image/video assets or silently delete unsupported content;
- change the app ID, macro key, scopes, `localId`-derived legacy key, or Marketplace listing;
- claim that native Confluence copy always assigns a fresh `localId`;
- deploy, release, or merge without the separate WP1 promotion gates.

### 1.1 Decisions requiring explicit approval

Approval of this child design approves five deliberate refinements rather than hiding them in implementation:

1. Only validated v15.5 documents are editable in the first WP2 release. Recognized older versions remain untouched and receive a local recovery download; production promotion additionally requires either read-only version-distribution evidence or explicit acceptance of this compatibility gate. This is a real compatibility choice because the SPA immediately before commit `2f18c64` declared tldraw `^1.1.5`; that is not evidence that all stored documents are already v15.5.
2. Analytics common fields use `app_version`, `app_commit`, and `environment_type` to match `conf-app`, replacing the parent design's provisional `release_version` and `environment` names.
3. WP2 emits load/save/render/resize/recovery events; migration events begin in WP5, where migration actually occurs as a product operation.
4. WP2 freezes the future modern key namespace and outer envelope only. WP5 freezes the SDK-specific inner snapshot after selecting the exact modern SDK.
5. WP2 adds pinned `@forge/kvs@1.2.5` to the already-converged `@forge/api@6.4.3` resolver and declares one permanent `whiteboard-state` Custom Entity. The resolver/bridge/config convergence has already landed and is not repeated here. A conditional write-ahead journal serializes current-resolver writes while the legacy KVS value remains the document of record. This avoids claiming compare-and-set from the legacy storage API, which has none. Activation is blocked until non-production Atlassian tests prove legacy-value visibility, missing-entity `notExists`, conditional conflict, interrupted-write recovery, and deploy version classification. Once deployed, Forge does not permit removing the entity declaration, so the rollback artifact must retain it.

The user accepted decision 1 with the rest of this child design. Production promotion still requires the specified read-only version-distribution evidence or an explicit release-time acceptance of the compatibility gate; design approval alone does not manufacture that evidence.

## 2. Evidence used by this design

The current implementation conflates KVS missing/read failure with `[]`, renders a seeded default document before load succeeds, mutates editor documents, clears `assets`, does not await writes, exposes a production-selectable mock, and logs raw context/document/payload objects.

The bundled v1 SDK declares document version `15.5`. Its internal migration accepts older data by mutation and can clear assets or reset corrupt input, so it is not a safe decoder for expanding the no-loss storage boundary. The public editor still invokes migration when a document is mounted; WP2 must prove that invocation is semantically idempotent for the narrower validated surface.

Repository history makes the older-version risk concrete without proving its distribution: the first root dependency introduction used `@tldraw/tldraw ^1.1.8`, the SPA immediately before commit `2f18c64` used `^1.1.5`, and that commit upgraded the SPA to `^1.26.2`. Raw documents may also predate the compressed envelope. WP2 therefore cannot infer that every production value is v15.5 from today's dependency alone.

The current resolver is already pinned to `@forge/api@6.4.3`, but its legacy `api.storage` surface still exposes only unconditional get/set/delete operations. Atlassian directs apps from that feature-frozen surface to [`@forge/kvs`](https://developer.atlassian.com/platform/forge/storage-reference/kvs-migration-from-legacy/), and [Custom Entity transactions](https://developer.atlassian.com/platform/forge/storage-reference/entities-transactions/) support conditional all-or-none operations. The npm-published `@forge/kvs@1.2.5` declarations contain the needed transaction filters while sharing the current `@forge/api@6.4.3` line. Those declarations establish a buildable design, not live-environment behavior; the five Atlassian checks in decision 5 remain mandatory.

Vite builds the frontend under `static/spa`, while Forge bundles the separate resolver entry from `src/index.js`. The new shared TypeScript codec therefore has one explicit build, and both frontend and resolver consume its package export; importing package `src` directly would not establish that both runtimes execute the same artifact.

A real, team-owned non-production Confluence fixture established the following baseline with published Marketplace build 3.4.0:

- a visible synthetic stroke survived save and reload;
- two macro ADF nodes deliberately given distinct fresh `localId` values rendered independent visible state;
- after independently editing the second macro and reloading, the first rendered fingerprint was unchanged and the two rendered fingerprints differed;
- the settled post-reload window contained zero page errors and zero console errors, alongside unrelated non-error Atlassian warnings.

This is evidence for preserving the final-`localId` key scheme when IDs differ. It is not exact-WP2 artifact evidence, a complete inspection of off-viewport document records, or proof of every native host copy surface. Exact-artifact Forge testing remains blocked until the available identity is granted contributor access to the original app.

## 3. Decoder approach

Three approaches were considered.

| Approach | Benefit | Risk | Decision |
|---|---|---|---|
| Exact v15.5 typed validation, lossless pass-through, fail closed | Pure decoding never uses migration to widen support; mounted migration is constrained by idempotence tests | Legitimate older documents remain blocked until evidence expands support | **Adopt for WP2** |
| Feed older documents through the v1 SDK migration | Broader apparent compatibility | Migration mutates input, clears some assets, and may reset corrupt data | Reject |
| Accept broadly and rely on editor render/error behavior | Least code initially | Invalid data can mount, reset, or become an editable blank board | Reject |

Support may expand only through a later reviewed fixture/evidence change. A decoder becoming more permissive is a storage-contract change, not a drive-by bug fix.

## 4. Legacy document contract

### 4.1 Result union and precedence

The public load contract returns a discriminated union; the pure value decoder owns every branch except `read-error`:

```text
missing
legacy-raw(document, fingerprint)
legacy-compressed(document, fingerprint)
unsupported(errorCode)
invalid(errorCode)
read-error(errorCode)
reconciliation-required(writeState)
conflict(errorCode)
```

Decode precedence is exact:

1. `undefined` is `missing`;
2. arrays are `unsupported / legacy_array_unsupported`;
3. an object with own property `compressedJson` enters only the compressed path;
4. an otherwise document-shaped object enters the raw path;
5. `null`, scalars, and other objects are `invalid / document_schema_invalid`.

The compressed envelope is initially exactly one own field, `compressedJson`, containing a non-empty Base64 string. Extra envelope fields are `unsupported / compressed_envelope_unsupported`; they do not fall back to the raw path. Base64, decompression, JSON parsing, and document validation have separate stable failure codes and never return partially decoded content.

`read-error`, `reconciliation-required`, and `conflict` are produced by the storage/journal adapter, not by the pure value decoder.

### 4.2 Supported v1 surface

The pure WP2 decoder accepts only root document version `15.5` and never invokes the SDK migration function as a compatibility mechanism. The public `<Tldraw document>` path cannot bypass migration. At version `15.5` its version-gated transforms are skipped, but it still repairs asset/parent relationships, clears transient page-state fields, and rewrites the version. WP2 therefore validates those relationships before mount, retains an immutable original, passes a deep clone to the editor, and tests that the editor migration changes only the explicitly excluded ephemeral state. It must never claim that migration was not invoked.

The root has exactly `id`, `name`, `version`, `pages`, `pageStates`, and `assets`, plus the app-owned optional `viewport`. `id` and `name` are strings; `version` is exactly `15.5`; `pages` and `pageStates` are non-empty plain records; `assets` is an empty plain record. At least one page exists. Record insertion order is preserved because v1 selects the first page from `Object.keys(document.pages)[0]`.

A page has exactly `id`, optional `name`, optional finite `childIndex`, `shapes`, and `bindings`. Its record key equals its `id`. It has exactly one page state whose record key and `id` also match. Shape and binding maps are plain records whose keys equal their contained IDs. IDs are non-empty strings, remain byte-exact, and cannot be the dangerous keys listed below.

Every supported shape has these exact common fields:

| Field | Contract |
|---|---|
| `id`, `type`, `name`, `parentId` | strings; ID and map/parent constraints apply |
| `childIndex` | finite number; fractional values are valid |
| `point` | exactly two finite numbers |
| `rotation` | optional finite number |
| `style` | exact closed style object below |
| flags | optional booleans `isGhost`, `isHidden`, `isLocked`, `isGenerated`, `isAspectRatioLocked` |

Only the producer-supported, asset-free subtype fields below are admitted:

| Type | Required fields | Optional fields and invariants |
|---|---|---|
| `rectangle` | `size: [w,h]` | `label`, `labelPoint: [x,y]`; dimensions finite and positive |
| `ellipse` | `radius: [rx,ry]` | `label`, `labelPoint: [x,y]`; radii finite and positive |
| `triangle` | `size: [w,h]` | `label`, `labelPoint: [x,y]`; dimensions finite and positive |
| `draw` | `points`, `isComplete` | at least one producer-form point `[x,y,pressure]`; values finite and pressure in `[0,1]` |
| `arrow` | finite `bend`; exact `start`, `bend`, and `end` handles | optional `decorations`, `label`, `labelPoint`; rules below |
| `text` | `text` | no persisted size field |
| `sticky` | `size: [w,h]`, `text` | dimensions finite and positive |
| `group` | `size: [w,h]`, non-empty `children` | dimensions finite and positive; graph rules below |

`line` is a tool enum, not a persisted shape: the Line tool produces an `arrow`. `image` and `video` are deliberately outside WP2 because they require assets. Fields belonging to one subtype, such as `children` or `handles`, are not accepted on another.

The exact style contract is:

| Key | Values |
|---|---|
| `color` required | `white`, `lightGray`, `gray`, `black`, `green`, `cyan`, `blue`, `indigo`, `violet`, `red`, `orange`, `yellow` |
| `size` required | `small`, `medium`, `large` |
| `dash` required | `draw`, `solid`, `dashed`, `dotted` |
| `font` optional | `script`, `sans`, `serif`, `mono` |
| `textAlign` optional | `start`, `middle`, `end`, `justify` |
| `isFilled` optional | boolean |
| `scale` optional | finite positive number |

Arrow handles are exact closed objects with `id`, `index`, `point`, optional `canBind`, and optional `bindingId`. Their identities are `start/0`, `end/1`, and `bend/2`; start and end are the only binding-bearing handles. Decorations contain only optional `start`, `middle`, and `end`, each with the sole value `arrow`. A binding has exact fields `id`, optional producer field `type: "arrow"`, `fromId`, `toId`, `handleId`, `distance`, and `point`. Its invariants are:

- `handleId` is `start | end`, never `bend`;
- `fromId` resolves to a same-page arrow and `toId` resolves to a distinct same-page rectangle, ellipse, triangle, text, sticky, or group that is not the arrow's parent;
- `point` is a finite normalized pair in `[0,1]²`, and `distance` is finite and non-negative;
- the arrow handle's `bindingId` and binding record are reciprocal, with no orphan or duplicate handle ownership.

The parent/group graph is reciprocal and acyclic. A root shape's `parentId` is its page ID; a child resolves to exactly one same-page group; every group child exists once and points back to that group. Self-child, duplicate parentage, repeated children, cycles, and duplicate sibling `childIndex` values are rejected. One-child groups are legitimate, but empty groups are not. The v1 producer creates page-root groups and flattens selected groups, so WP2 rejects nested groups and caps group depth at one.

The following are `unsupported` with zero writes:

- any root version other than `15.5`;
- `image`, `video`, or any unrecognized shape type;
- any shape carrying an `assetId`;
- any non-empty `assets` map;
- dangling or structurally unsupported bindings;
- a recognized document feature outside the frozen allowlist.

Malformed values inside the frozen surface are `invalid`. The schema is closed: fields not listed by the frozen v15.5 root/page/page-state/shape/handle/binding/style contracts are `unsupported / document_feature_unsupported`. This is stricter than passing opaque fields into an editor that may strip them. The keys `__proto__`, `prototype`, and `constructor` are rejected as IDs, record keys, or unknown object keys at every depth before any merge or clone. Validation uses own-property checks and null-prototype internal dictionaries; it never trusts inherited lookup results. Ordinary `JSON.parse` has already discarded duplicate JSON keys, so duplicate-key detection is not claimed. Adding a field to the allowlist is a reviewed storage-contract change.

### 4.3 Camera, page state, and viewport

- Every page has one matching page-state entry, and page/map keys agree with object IDs.
- Camera `point` is exactly two finite numbers.
- Camera `zoom` is finite and within the v1 clamp range `[0.1, 5]`.
- `selectedIds` is an array of unique same-page shape IDs. Optional `pointedId`, `hoveredId`, and `editingId` are null/absent or resolve to a same-page shape; optional `bindingId` resolves to a same-page binding. Optional `brush` is null/absent or the exact finite `minX`, `minY`, `maxX`, `maxY`, `width`, `height`, and optional `rotation` bounds object.
- Codec validation preserves the complete v1 page state.
- The editor fingerprint excludes only ephemeral editor state that the SDK resets during mount: `selectedIds`, `pointedId`, `hoveredId`, `editingId`, and `bindingId`. `brush` remains in the editor fingerprint because the bundled v1.26.2 cleanup path preserves a truthy brush; camera also remains durable view state and is compared separately from board content.
- Top-level `viewport` has exactly one field, `height`. It is optional; when present, height is finite and within `[200, 4096]` CSS pixels. An existing out-of-range value is `unsupported / viewport_height_invalid`; it is never silently clamped and saved.
- A missing viewport uses height `400` in memory only. Loading does not add or persist it.
- The UI enables bottom-edge resizing only; horizontal/right-edge resizing is removed because width is host-controlled and was never persisted. Resize persistence occurs only after an explicit completed gesture.

### 4.4 A truly empty missing document

Only `missing` may construct a new board. The SDK exposes a mutable `TldrawApp.defaultDocument` singleton but no pure factory, so WP2 does not use that object by reference. `createEmptyLegacyDocument()` returns a fresh deep clone of the SDK's canonical empty v15.5 literal with:

- version `15.5`;
- one page and one matching page state;
- empty `shapes`, `bindings`, and `assets` maps;
- camera point `[0, 0]` and zoom `1`;
- no persisted viewport until an explicit edit or resize is saved.

The existing seeded `defaultDocument` is not an empty-board factory and is removed from the load path. Construction performs zero KVS writes.

### 4.5 Editor mount and save boundary

The exact path from storage to editor is deliberately observable:

1. Decode and validate the retrieved structured value into an immutable logical `original`; compute its codec, editor, and mount fingerprints.
2. Create a structural deep clone without merge helpers or prototype-bearing dictionaries. Never mutate `original`.
3. Mount that clone with the editor container hidden and pointer-disabled. The v1 editor still runs its bundled migration.
4. In `onMount`, revalidate `app.document` and compare its mount fingerprint with `original`. Only an exact persistent drawing-semantics match makes the editor visible and arms persistence callbacks.
5. Any migration/validation difference unmounts the editor as `editor_migration_changed_persistent_data`, offers recovery download, and performs zero document writes.
6. Initial `onPersist` calls and later callbacks equal to the last confirmed editor fingerprint are ignored.
7. After an explicit edit or completed resize, clone the current editor document, attach the current valid viewport height without mutating `app.document`, validate it again, then enqueue that immutable snapshot. The SDK strips this app-owned top-level `viewport` field while mounting, so mount comparison ignores only this field in addition to the audited ephemeral page-state fields.

The SDK-cleared page-state fields and the app-owned top-level viewport are the only mount differences ignored by the mount fingerprint. They remain in `original` for codec round-trip/recovery purposes, but a later explicit user save may persist the editor's current ephemeral state and current viewport height. `brush` is not in this exception because the audited v1.26.2 cleanup path does not clear it. No unknown field, asset, graph repair, label rewrite, geometry change, or version change is ignored.

## 5. Fingerprints and loss detection

WP2 defines three canonical SHA-256 fingerprints.

The **codec fingerprint** includes root identity/name/version, page membership and insertion order, complete supported shape and binding semantics, complete page states, camera, optional viewport, and the fact that assets are empty.

The **editor fingerprint** includes the same persistent drawing semantics and viewport height but removes the ephemeral page-state fields listed in section 4.3. It gates save coalescing and behavioral comparisons. The separate **mount fingerprint** additionally removes the app-owned top-level viewport because the tldraw SDK does not retain it in `app.document`; every drawing, page, camera, brush, shape, binding, and asset semantic remains covered. The DOM hashes captured in the existing Atlassian baseline are separate UI evidence and are not substitutes for these document fingerprints.

Canonicalization is schema-directed rather than a recursive object-key sort. Field order is fixed by the schema, arrays preserve order, and every record map is encoded as ordered `[key, value]` entries in original insertion order. This matters because v1 selects the initial page from `Object.keys(document.pages)[0]`, and insertion order can also break child-index ties. It rejects non-finite numbers and normalizes negative zero to zero. WP2 uses zero numeric tolerance because this is a v1-to-v1 lossless codec. Any non-zero geometry tolerance belongs to the WP5 modern-SDK design.

Pure decode/encode must preserve the codec fingerprint exactly. A no-edit mount must preserve the mount fingerprint and perform zero writes. After a specified edit, the expected editor fingerprint (source semantics plus the specified delta) must survive save and reload; the pre-edit and post-edit codec fingerprints are expected to differ.

Fingerprints may appear in synthetic test assertions and privacy-safe evidence. They are not sent to analytics or logs for real boards because a stable content-derived hash is still customer-content metadata.

## 6. Key and storage contract

### 6.1 Legacy key

`deriveLegacyKey(context)` preserves the final segment of a valid string `context.localId` byte-for-byte. It rejects missing, non-string, empty, trailing-slash, over-500-character, or Forge-KVS-format-invalid IDs with `invalid_local_id`. It does not decode, normalize, lowercase, log, return in an error, or add a prefix to the legacy key.

The real-Forge copy fixture supports the invariant that distinct fresh final segments resolve independently. Native same-page and cross-page host-copy behavior remains a named E2E assertion; no new key scheme is inferred from the current evidence.

### 6.2 New resolver operations

WP2 adds only the exact Forge storage dependency `@forge/kvs@1.2.5`; the existing exact `@forge/api@6.4.3` stays unchanged. The document remains at its existing legacy KVS key and in its exact one-field compressed envelope. A Custom Entity named `whiteboard-state` is a write-ahead coordination journal, not a second document source.

| Storage approach | Result | Decision |
|---|---|---|
| Legacy get/compare/set | Cannot prevent a write between compare and set | Reject as a data-safety claim |
| Make Custom Entity the document source | Conditional update is simpler, but a literal pre-WP2 reader no longer sees the authoritative value | Reject for WP2 rollback compatibility |
| Conditional journal + legacy document source | Serializes current resolver intents, recovers partial writes, and preserves the old value format | **Adopt, subject to Atlassian proof** |

The entity has no custom indexes and declares typed attributes for `schemaVersion`, `revision`, `state`, `currentToken`, `expectedToken`, `candidateToken`, `writeId`, and `compressedJson`. `schemaVersion` is integer `1`; `state` is exactly `confirmed | pending`. `writeId` remains in both forms so a lost finalize response can be reconciled idempotently; the candidate payload and expected/candidate tokens are absent in the confirmed form. Its key is `wb.s1.<lowercase SHA-256 of exact legacy-key bytes>`; the unhashed legacy key never enters the entity. The declaration lives under `app.storage.entities` and must remain in every future and rollback manifest after its first deployment.

No journal means confirmed revision `0`. The first acquired write stores pending revision `1`; each later acquisition requires `state=confirmed` and exact `revision=baseRevision`, then stores `baseRevision + 1`. Finalization keeps that target revision. Revision is a non-negative Forge `integer`; reaching `2,147,483,647` blocks further writes as `storage_revision_exhausted` rather than overflowing. Storage tokens are domain-separated: `m` for missing, `r:<codec fingerprint>` for a validated raw document, and `c:<SHA-256 of the exact compressedJson string>` for a compressed envelope. Unsupported/invalid values never receive a client-writable token. A confirmed journal's `currentToken` must equal the token derived from the strictly read legacy value or loading freezes as `storage_conflict`.

`src/index.js` becomes wiring around dependency-injected handlers. The exact logical protocol is:

```text
load-document(context)
  derive legacy and journal keys
  strictly read journal and legacy value
  if journal is pending, classify reconciliation state without writing
  decode/validate legacy value
  return typed result + { revision, token }, without either key or raw error

save-document(context, compressedEnvelope, baseRevision, expectedToken, writeId)
  derive keys
  enforce wire limits and independently decompress/validate before KVS access
  transactionally create/update a pending journal using confirmed-state/revision conditions
  strictly re-read legacy value and compare its exact-value token
  set the legacy value only when it still matches expectedToken
  strictly read back and verify the candidate token
  transactionally finalize the same writeId as confirmed
  return { kind: "saved", revision, token } without document body

resume-save(context, writeId)
  strictly read pending journal and legacy value
  if legacy matches expectedToken, write the recorded candidate
  if legacy matches candidateToken, do not rewrite it
  otherwise freeze as storage_conflict with zero document writes
  verify and conditionally finalize the same writeId
```

The first pending journal write uses `FilterConditions.notExists()` on `revision`; later writes require exact equality with `baseRevision`. A failed condition writes neither journal nor document. Only the holder of one pending `writeId` may advance the legacy value. Multiple recovery calls for that same write may repeat the same candidate set, but cannot select different content. Finalization is idempotent: a confirmed record with the same `writeId` is success, while a different revision/write is conflict.

This journal closes the current-resolver cross-session race without pretending the document KVS write and entity transaction are one atomic operation. A crash at any boundary leaves a typed, recoverable intent:

- legacy equals `expectedToken`: the candidate was not stored and Retry may store it;
- legacy equals `candidateToken`: the candidate was stored and Retry only finalizes it;
- legacy matches neither: an external/stale writer intervened, so WP2 freezes editing and never force-overwrites.

`load-document` never repairs a pending write automatically. It returns `storage-journal-pending`, and the UI requires an explicit Retry/Resume action before editing. Therefore ordinary load/error paths still perform zero writes. Rollout overlap with an in-flight pre-WP2 resolver is not claimed safe merely from the design; the exact Atlassian race fixture and a deployment drain window are release gates.

The shared codec compresses in the frontend so a document that fits storage does not cross the bridge as raw JSON. The backend never trusts that result: it decompresses and validates independently before any document write. KVS exceptions become stable result codes; raw errors, context, keys, and request payloads never enter logs or error responses. Successful load responses necessarily return the authorized macro's document/wire value to its iframe; that value remains in memory only and is never logged or analyzed.

The write format remains compatible with the pre-WP2 reader: the existing legacy key and exact one-field compressed envelope. Raw legacy values become compressed only after an explicit successful user change. Content-derived tokens exist only in the coordination journal and bridge memory; they are never logged, displayed, returned by recovery download, or sent to analytics.

Atlassian documents that [direct entity reads are strictly consistent](https://developer.atlassian.com/platform/forge/storage-reference/entities/) and conditional Custom Entity transactions roll back as a unit. Nevertheless, WP2 activation is blocked until the original app proves the pinned package can (a) read legacy values written by the old `@forge/api.storage`, (b) conditionally create an absent entity with `notExists`, and (c) reject competing revision writes. If any proof fails, the journal path stays disabled and WP2 is not declared data-safe; it does not silently fall back to best-effort read/compare/set.

### 6.3 User recovery download

Unsupported and invalid stored values offer an explicit **Download recovery file** action; read failures do not, because no value was retrieved. The action invokes a separate resolver that re-reads the current authorized legacy slot and returns a fixed wrapper:

```json
{
  "kind": "whiteboard-recovery",
  "formatVersion": 1,
  "source": "stored",
  "value": "<the JSON-safe structured value returned by Forge storage>"
}
```

`value` above is schematic: its actual JSON type/value is embedded, not string-coerced. The stored path performs one resolver read, then creates the Blob locally. A save-validation failure uses the same wrapper with `source: "unsaved"` and the last immutable snapshot entirely in-browser, with no resolver or network request. Both create `whiteboard-recovery.json`. This is a semantic recovery copy of Forge's retrieved JSON value or the unsaved in-memory snapshot, not a claim to preserve whitespace or duplicate keys that storage/JSON parsing has already discarded. It includes no key, `localId`, context, tenant/content/user identifier, URL, timestamp, release, or content-derived token. Download never writes storage. Requested/succeeded/failed analytics contain only allowlisted enums and coarse size buckets.

### 6.4 One-release cached-client guard

`create`, `delete`, and `delete-all` are removed immediately.

For one release, hardened aliases for cached pre-WP2 browser bundles remain:

- `get-all` returns a document only after a successful typed read; unsupported/invalid/read-error values reject without being converted to `[]`;
- `get-all` returns `undefined` for a missing slot;
- `update` validates the proposed compressed document, then enters the same journal protocol; it refuses writes when the protective read fails, the current value is unsupported/invalid, or the slot is missing. A cached old bundle must reload before creating a new board, so its seeded default cannot become the first stored value.

Because the old request carries no base token, this alias cannot prove that its whole-document snapshot was based on the latest read; serialization alone does not eliminate semantic staleness. It prevents the more severe read-error-to-blank overwrite and prevents it racing through an unjournaled write, but is explicitly weaker than the new protocol. It logs only the fixed code `legacy_resolver_used`. It remains for at least 30 days and may be removed only in an explicit PR after 14 consecutive observable production days with zero calls plus a cached-client PVT. If contributor access cannot read the required logs, the alias remains; it is not silently carried into WP6.

### 6.5 Resource limits

The platform boundaries are authoritative: Forge KVS keys are at most 500 characters, values at most 240 KiB raw, and stored objects at most 31 levels deep; Custom UI `invoke` requests are at most 500 KB and responses at most 5 MB. See Atlassian's [KVS limits](https://developer.atlassian.com/platform/forge/limits-kvs-ce/) and [invocation limits](https://developer.atlassian.com/platform/forge/limits-invocation/).

WP2 fails before bridge/KVS access when either the serialized legacy envelope or the exact pending journal entity would exceed 240 KiB; the journal metadata overhead means the candidate limit is slightly below the raw platform maximum and is computed in UTF-8 bytes, not guessed as a character count. It also freezes defensive decoded-document budgets: 8 MiB UTF-8 JSON, depth 31, 10,000 shapes, 20,000 bindings, 250,000 draw points, and 1 MiB total UTF-8 text. Nested groups are rejected, so group depth is one. `payload_too_large` and `document_too_complex` are unsupported, zero-document-write outcomes with recovery download. Boundary fixtures prove exact acceptance/rejection and keep every bridge wrapper below 500 KB.

LZUTF8 does not expose a trusted streaming output limit. WP2 therefore checks Base64 and compressed-size budgets before decompression, performs decompression only in the resolver's bounded runtime, and rejects decoded UTF-8 above 8 MiB before parsing. The test suite includes high-ratio synthetic input; a failure to stay within the runtime memory/time budget blocks release rather than weakening the cap.

## 7. Frontend state machines

The editor is not mounted during loading or a load failure.

```text
loading
  -> mount-probing(missing | legacy-raw | legacy-compressed) -> ready
  -> reconciliation-required(pending-write)
  -> error(unsupported | invalid | read-error | bridge-error)
```

Only `mount-probing` and `ready` receive a document, and the editor is hidden/non-interactive until the mount probe succeeds. Unsupported and invalid states show a non-editable explanation plus recovery download when a stored value is available. Read/bridge failures show Retry. A pending journal shows Resume interrupted save; no document edit is enabled until reconciliation succeeds. Retrying repeats only the failed operation; no error action constructs or saves an empty document.

Save state is independent of load state:

```text
confirmed -> dirty -> acquiring -> writing -> finalizing -> confirmed
                           |           |            |
                           +-----------+------------+-> retryable-failed
                           +--------------------------> blocked
```

The ordered queue has these exact rules:

1. Snapshot and validate the document at enqueue time; never retain mutable `app.document` references.
2. Assign a monotonic in-iframe sequence and a random idempotency `writeId`; use the server-confirmed journal revision as the concurrency base.
3. Allow one write in flight.
4. While a write is in flight, replace the pending snapshot with the newest one. A/B/C rapid edits write A and then C; B is coalesced.
5. Drawing and completed resize gestures use the same queue.
6. A successful write advances the last-confirmed fingerprint only for that written revision.
7. If A is in flight and the user undoes back to the previously confirmed snapshot X, retain X as the pending newest snapshot. If A succeeds, write X after A to restore the user's visible state. Clear X immediately only when A definitely failed before journal acquisition; after acquisition, reconcile the journal first and then decide whether X still requires a compensating write.
8. A retryable failure retains the newest valid unsaved snapshot, stops automatic retries, and exposes Retry. Edits may continue only when the resolver proves no write occurred. If the outcome is unknown or a journal is pending, the editor becomes read-only until reconciliation.
9. Schema validation failures are non-retryable `save_validation_failed`; resource failures retain their specific `payload_too_large` or `document_too_complex` codes. All three freeze editing, offer an in-memory recovery download, and require reload. A producer-created invalid document is treated as a bug, not repeatedly submitted.
10. `storage_conflict` is non-retryable until reload and has no force-overwrite action. Bridge/KVS read failures before a write are retryable. A failure after journal acquisition or an unconfirmed write must use `resume-save`; it never starts a fresh write with a new ID.
11. Mount callbacks and changes whose editor fingerprint equals the loaded/confirmed fingerprint perform zero writes.
12. Current-resolver cross-tab/user writes are serialized by the conditional journal. Cached old clients remain semantically weaker because they cannot send the token from their original read; that limitation is surfaced in section 6.4 and the fixed `legacy_resolver_used` safe-log code. It is intentionally not a Mixpanel event.

`WhiteboardErrorBoundary` catches editor render failures, records only `editor_render_failed`, unmounts the editor, and never invokes save.

## 8. Analytics, logging, and build identity

### 8.1 Analytics-first implementation commit

The first WP2 runtime-branch commit adds the catalog, types, privacy wrapper, and contract tests before feature code is written.

Every event has fixed common properties:

```text
feature_area = whiteboard
surface = confluence_macro
macro_type = whiteboard
app_version
app_commit
sdk_version
environment_type
outcome
```

These names intentionally match `conf-app`'s canonical build keys. They refine the parent design's provisional `release_version` / `environment` names and add the previously missing exact commit. Approval of this child design approves that explicit naming refinement; no alias pair is emitted.

Event definitions are frozen as follows:

| Event | Trigger | Additional allowlisted properties |
|---|---|---|
| `whiteboard_load_requested` | one macro begins a load attempt | `schema_target` |
| `whiteboard_load_succeeded` | validated document/empty factory becomes ready | `source_format`, `duration_bucket`, `size_bucket` |
| `whiteboard_load_failed` | storage, bridge, decode, or validation fails | `phase`, `error_code`, `source_format` |
| `whiteboard_save_requested` | an explicit edit or resize snapshot enters the queue | `change_source`, `target_schema`, `size_bucket` |
| `whiteboard_save_succeeded` | the queued revision is confirmed stored | `change_source`, `duration_bucket`, `size_bucket`, `coalesced_bucket` |
| `whiteboard_save_failed` | validation, bridge, or KVS write rejects | `phase`, `error_code`, `retryable` |
| `whiteboard_save_reconciliation_requested` | user resumes one interrupted journaled save | `phase` |
| `whiteboard_save_reconciliation_succeeded` | the same write ID is verified and finalized | `phase`, `duration_bucket` |
| `whiteboard_save_reconciliation_failed` | reconciliation cannot safely finish | `phase`, `error_code`, `retryable` |
| `whiteboard_render_failed` | the editor error boundary catches rendering | `error_code` |
| `whiteboard_resize_succeeded` | a completed resize snapshot is confirmed stored | `size_bucket` |
| `whiteboard_resize_failed` | persistence of a completed resize fails | `size_bucket`, `error_code` |
| `whiteboard_recovery_download_requested` | user requests a local recovery file | `source_format`, `reason_code` |
| `whiteboard_recovery_download_succeeded` | browser creates the local recovery Blob | `source_format`, `size_bucket` |
| `whiteboard_recovery_download_failed` | resolver read or Blob creation fails | `phase`, `error_code` |

Migration events remain reserved for WP5 and are not emitted in WP2.

Stable error codes include:

```text
invalid_local_id
kvs_read_failed
legacy_array_unsupported
compressed_envelope_unsupported
compressed_base64_invalid
compressed_json_invalid
document_schema_invalid
document_version_unsupported
document_feature_unsupported
assets_unsupported
shape_type_unsupported
binding_unsupported
viewport_height_invalid
payload_too_large
document_too_complex
editor_migration_changed_persistent_data
save_validation_failed
storage_conflict
storage_journal_pending
storage_journal_finalize_failed
storage_revision_exhausted
legacy_client_reload_required
kvs_write_failed
bridge_invoke_failed
recovery_download_failed
editor_render_failed
```

The event-name union is derived from one `as const` catalog. A per-event property map and a runtime allowlist build a new outbound payload; caller properties are never spread into Mixpanel. Unknown keys, nested values, and non-finite numbers cause zero sends. Durations, sizes, and coalesced counts are coarse fixed buckets. No event includes document text, shape/style/geometry, hashes, compressed data, `localId`, KVS key, page/content/tenant/user identifiers, URL, referrer, or raw error text.

### 8.2 Mixpanel hardening

Typed event properties are not sufficient because `mixpanel-browser@2.47.0` adds environment properties automatically. Initialization must set:

```text
track_pageview: false
autocapture: false
track_marketing: false
store_google: false
save_referrer: false
disable_persistence: true
ip: false
debug: false outside local development
```

The payload uses one constant anonymous `distinct_id` and blacklists URL/referrer, initial-referrer, search-engine, device ID, UTM, and click-ID fields, including `$current_url`, `$referrer`, `$referring_domain`, `$initial_referrer`, `$initial_referring_domain`, `$search_engine`, `$device_id`, all `utm_*`, `gclid`, `dclid`, `fbclid`, `msclkid`, `ttclid`, and `twclid`. Contract tests inspect the final transport payload, not only the typed wrapper input. Session replay, user identification, automatic page/content/tenant enrichment, and `ignore_dnt` are not ported from `conf-app`.

The current hard-coded project token moves to `VITE_MIXPANEL_TOKEN`, supplied by Actions or a gitignored local environment. A missing token disables analytics without affecting the editor.

Analytics failure never blocks load, save, or retry.

### 8.3 Safe logging

Both frontend and resolver use an allowlist logger accepting only event code, phase, outcome, build metadata, and stable error code. Passing an `Error`, document, context, payload, key, URL, or unknown property fails a unit test and is dropped at runtime. Current raw console logging is removed.

### 8.4 Exact build identity

Following the smallest applicable `conf-app` pattern, the Vite build embeds and exposes:

- exact 40-character `app_commit` from the checked-out source;
- `app_version` as the release tag or the fixed value `unreleased`;
- exact SDK version `1.26.2`;
- fixed `environment_type` enum `local | ci | development | staging | production`.

Vite uses `VITE_*` inputs through a typed build-info module. Staging and production workflows inject these values during both validation and the deploy rebuild, and contract tests require the deploy input artifact to match the verified SHA. A debug panel displays only `app_version@shortSha`, SDK, and environment; host, branch, context, content ID, and tenant data are removed. Production/staging builds fail rather than emitting `unknown` identity.

| Build | `app_version` | `app_commit` | `environment_type` |
|---|---|---|---|
| local | `unreleased` | checked-out commit | `local` |
| CI validation | `unreleased` | workflow head SHA | `ci` |
| Forge tunnel/development | `unreleased` | tunneled source SHA | `development` |
| staging | `unreleased` | staged source SHA | `staging` |
| production | normalized release tag | exact tagged SHA | `production` |

The production release must use the same source SHA that passed staging, while its version/environment metadata necessarily differs. The claim is source-lineage identity, not byte-for-byte equality between staging and production bundles. A local dirty-tree build is visibly suffixed/flagged as dirty and cannot satisfy an exact-artifact gate.

This unblocks a repository-local `check-version` skill and lets PVT prove exact-artifact provenance in the iframe.

## 9. Module boundaries

Precompiled pure-codec workspace:

```text
packages/whiteboard-codec/
  package.json
  tsconfig.build.json
  src/types.ts
  src/legacyKey.ts
  src/validateLegacyDocument.ts
  src/legacyCodec.ts
  src/emptyLegacyDocument.ts
  src/semanticFingerprint.ts
  src/index.ts
```

The private package name is `@zenuml/whiteboard-codec`. It has no React, DOM, Forge, or tldraw runtime dependency and owns exact `lzutf8@0.6.3`. It pins TypeScript `4.9.3`, emits strict ES2019/ES2020-module JS plus declarations into gitignored `dist`, and exposes only `./dist/index.js` / `./dist/index.d.ts` through one package export. Both root and `static/spa` depend on `workspace:*`; neither imports package `src`.

The codec produces the schema-directed canonical string but does not import browser or Node crypto. Fingerprint/key helpers accept an injected `sha256Hex(canonicalUtf8)` adapter: the frontend uses Web Crypto and the resolver uses Node's crypto implementation, with each adapter responsible for exact UTF-8 encoding. Shared golden vectors require both adapters to return identical lowercase hex before either is wired to persistence.

`pnpm-workspace.yaml` adds `packages/*`. Root `build:codec` runs before unit tests, the Vite build, Forge lint/bundle/deploy, and tunnel. Tests import the public built package export, so a missing or stale `dist` fails rather than letting Vitest mask an integration problem. The logical CI order is codec build → unit tests → Vite build → Forge lint/deploy bundle. Package manifests, lockfile, build order, and generated-output validation remain one integrator's ownership.

Resolver boundary:

```text
src/persistence/createLegacyStorageHandlers.mjs
src/persistence/createWhiteboardJournal.mjs
src/observability/safeLogger.mjs
src/index.js
```

Frontend boundary:

```text
static/spa/src/persistence/createOrderedSaveQueue.ts
static/spa/src/persistence/whiteboardPersistenceReducer.ts
static/spa/src/persistence/useWhiteboardPersistence.ts
static/spa/src/components/WhiteboardStatus.tsx
static/spa/src/components/WhiteboardErrorBoundary.tsx
static/spa/src/utils/analytics/catalog.ts
static/spa/src/utils/analytics/types.ts
static/spa/src/utils/analytics/trackWhiteboardEvent.ts
static/spa/src/buildMetadata.ts
```

`AppFactory` becomes composition only. `MockApp` and the production-selectable `localStorage` bridge switch are removed.

### 9.1 Skill convergence unlocked by WP2

The repository-local skills keep the WP1 lifecycle and adopt the smallest applicable `conf-app` behavior without product-variant loops:

- `check-version` reads the Whiteboard iframe's build surface and reports `app_version`, exact commit, SDK, and environment; it never infers version from a page asset URL;
- `forge-tunnel` always builds the codec first, permits only the named development fixture adapter, and fails if the exact app identity/contributor preflight is unavailable;
- `spot-check` records assertion-level iframe screenshots/snapshots or resolver intercepts and uses only synthetic fixture enums in public artifacts;
- Whiteboard PVT covers load, edit, confirmed save, reload, recovery/error UI, privacy-safe console, and build identity; production PVT never seeds or mutates failure fixtures;
- `release-app` retains the single-product WP1 release contract and consumes `check-version` plus Whiteboard PVT as promotion evidence. It gains no lite/full/diagramly loops.

Skill contract tests reject hard-coded tenant/page identifiers, production-selectable mocks, skipped codec builds, and UI PASS results without an evidence artifact.

## 10. Fixtures and verification

All public fixtures are purpose-built synthetic values under `tests/fixtures/wp2/`:

```text
legacy-raw-v15.5.json
legacy-compressed-v15.5.json
legacy-all-eight-shapes-v15.5.json
legacy-multi-page-ordered-v15.5.json
legacy-arrow-bindings-groups-v15.5.json
unsupported-array.json
invalid-object.json
corrupt-base64.json
corrupt-json.json
unsupported-assets-v15.5.json
unsupported-version-0.json
unsupported-version-13.json
unsupported-version-13.1.json
unsupported-version-14.json
unsupported-version-15.json
unsupported-version-15.2.json
unsupported-version-15.3.json
unsupported-version-15.4.json
unsupported-version-future.json
unsupported-unknown-field-v15.5.json
invalid-dangerous-key.json
invalid-graph-v15.5.json
resource-boundaries.json
viewport-boundaries.json
semantic-fingerprints.json
```

Customer-derived values are not copied into the public repository. Private fixtures require a separate review and are not needed to begin WP2.

Unit/contract suites cover:

- exact key derivation and rejected contexts;
- raw/compressed round trips, unknown-field rejection, and exact-v15.5 editor-migration idempotence;
- every invalid/unsupported/read-error zero-write path;
- exact v15.5 type/style/page-order/binding/group/camera/viewport validation across all eight supported shapes and multiple pages;
- every historical version threshold staying untouched and producing a content-equivalent recovery file;
- dangerous-key, resource-boundary, compressed-bomb, and depth rejection;
- a truly empty missing document and zero initial writes;
- A/B/C write ordering, coalescing, undo-to-confirmed reversal, newest-snapshot retry, and resize ordering;
- conditional journal first-create/update conflicts, every interruption boundary, idempotent resume/finalize, and unexpected-token freeze;
- compatibility alias protective reads and its explicit stale-snapshot limitation;
- analytics final-payload privacy and safe-logger allowlists;
- recovery Blob contents/filename/privacy, with zero storage writes;
- build metadata matrix, dirty-tree behavior, and workflow propagation;
- production bundles being unable to select a mock adapter;
- pure load/save reducer transitions without requiring a browser DOM.

### 10.1 Atlassian journeys for the exact WP2 SHA

Once original-app contributor access exists, the exact WP2 build must run in a real Forge iframe:

1. Fresh macro: load a truly empty board, observe zero initial save calls, draw one synthetic stroke, observe one confirmed save, reload, and observe the stroke.
2. Raw and compressed v15.5 fixtures with empty assets: load, edit, save, and reload without semantic-fingerprint loss.
3. Storage compatibility: prove `@forge/kvs.get` sees a fixture previously written through `@forge/api.storage`; prove missing-entity `notExists`, equal-revision success, stale-revision rollback, and exact deploy version classification.
4. Rapid edits: delay the first synthetic write, make B and C edits, and observe A then C storage confirmation; repeat with an undo to the pre-A state and observe the compensating save.
5. Interrupted save: fail at each journal/write/finalize boundary, observe the read-only resume state, resume the same write, reload, and verify exactly one candidate semantics.
6. Concurrent editors: load the same fixture in two iframes, let one commit, and observe the other's stale revision fail with zero force-overwrite.
7. Read-error, invalid, corrupt, historical/future-version, unknown-field, non-empty-assets, oversized, and invalid-viewport fixtures: observe a non-editable UI and zero document-save calls; download and inspect a recovery file where available.
8. Copy isolation: repeat the distinct-fresh-`localId` ADF fixture on the exact build; add native host-copy coverage only when the rich clipboard action can be driven reliably.
9. Privacy: inspect iframe console and resolver/request evidence for absence of fixture text, context, IDs, URLs/referrers, hashes, and raw errors.
10. Identity: observe release, exact SHA, environment, and SDK in the debug surface.

Failure-state data may be supplied by a tunnel-only dependency-injected storage adapter. It accepts only named synthetic fixture enums and is enabled only when both the Forge development environment and an explicit test flag are present. Workflow/bundle contracts prove it is unavailable in staging and production. Missing data may be mocked; app identity and exact build provenance may not.

Every UI assertion needs an iframe screenshot/snapshot or request/resolver intercept. Unit tests alone never mark a UI assertion passed.

## 11. Release and rollback

WP2 is one data-safety release. Vite, tldraw v1, Forge identity, permissions, legacy key serialization, and the legacy compressed envelope remain unchanged. The only runtime dependency/manifest expansion is exact `@forge/kvs@1.2.5` and the approved `whiteboard-state` journal declaration.

The document remains backward-readable by the pre-WP2 v1 binary because WP2 writes the same compressed envelope at the same key. However, Forge documents that a deployed [Custom Entity declaration](https://developer.atlassian.com/platform/forge/storage-reference/entities-manifest/) cannot later be deleted and cannot be backported. The operational rollback artifact is therefore prepared and validated before promotion: it restores the WP1 UI/behavior while retaining the WP2 manifest declaration and a journal-aware compatibility resolver. Deploying the literal pre-WP2 manifest is not an accepted rollback. No modern slot or forward-only document format is introduced.

Before promotion:

- exact-SHA staging/tunnel evidence must exist;
- legacy KVS visibility, conditional first-create/conflict, interrupted journal recovery, and the prepared rollback artifact must pass on the original non-production app;
- build identity must match the staged commit;
- the first staging deploy output must classify the manifest/version impact; production remains blocked until that observed result is reviewed because package declarations do not prove Forge deployment classification;
- public Whiteboard naming, the approved fixture, and the `conf-app`-aligned publication authorization remain enforced;
- the cached-client compatibility behavior and removal criterion appear in release notes;
- production PVT and delta spot-check remain separate from CI.

Current contributor denial blocks exact-artifact Forge execution. Local/unit/mock implementation may proceed after design approval, but the WP2 exit gate remains `BLOCKED`, never `PASS`, until that external prerequisite closes.

## 12. Modern-slot reservation and parent-design refinement

WP2 neither reads nor writes a modern slot. To prevent later namespace improvisation, it reserves the deterministic key form:

```text
wb.m1.<lowercase SHA-256 hex of the exact legacy key bytes>
```

The stable outer value envelope is reserved as:

```json
{
  "kind": "whiteboard-modern",
  "schemaVersion": 1,
  "sdkVersion": "<exact selected SDK version>",
  "source": {
    "legacyVersion": 15.5,
    "legacyFingerprintSha256": "<64 lowercase hex>"
  },
  "snapshot": "<validated SDK-specific snapshot>"
}
```

It contains no timestamp, tenant, content ID, `localId`, author, or release identifier. WP2 does not implement this reservation.

The exact inner `snapshot` schema cannot be evidence-driven until WP5 selects and pins the modern SDK. This child design therefore proposes one explicit refinement to parent section 14: WP2 freezes the namespace and stable outer envelope; WP5 must freeze the exact inner snapshot schema and golden fixtures before any WP5 code. Approval of this child design approves that refinement.

## 13. Implementation sequence after approval

1. Create a runtime branch stacked on the approved design/WP1 head.
2. Commit analytics catalog, types, privacy wrapper contracts, and events first, without feature wiring.
3. Add the precompiled codec workspace, build-order contracts, and synthetic fixtures test-first.
4. Add the pinned Forge-storage slice, journal/resolver handlers, compatibility guard, recovery read, and safe logging test-first.
5. Add the pure frontend reducer and ordered queue test-first, then the loading/error/retry UI.
6. Add build identity plus the minimal workflow and skill changes.
7. Run full local validation and checked-in E2E collection.
8. Use the tunnel-only adapter for failure UI evidence when contributor access exists.
9. Exercise real KVS and copy journeys on Atlassian for the exact SHA.
10. Submit a separate Draft runtime PR; do not merge, release, or deploy production automatically.

Parallel ownership after the analytics-first commit:

- codec package + fixtures;
- resolver/journal/storage + safe logging;
- frontend state machine + UI;
- E2E/skills/build-identity contracts;
- package manifests, lockfile, workflows, and final integration remain single-owner.

## 14. Exit criteria

WP2 is complete only when:

- every frozen fixture decodes or fails closed exactly as specified;
- missing, loading, unsupported, invalid, read-error, and render-error paths perform zero writes;
- only explicit edit/resize actions write;
- rapid edits preserve the newest in-iframe state, undo reversal is not lost behind an in-flight save, and failed saves retry only when the backend proves that is safe;
- current-resolver concurrent saves are revision-serialized, interrupted journal states reconcile idempotently, and stale/unexpected values freeze without force-overwrite;
- raw and compressed empty-assets documents preserve the codec fingerprint through pure round trips, preserve the no-edit editor fingerprint through mount, and preserve the expected post-edit editor fingerprint through save/reload;
- historical versions, unsupported fields/assets, and invalid/resource-exhausting values are non-editable and untouched, with local recovery available when a value was read;
- final analytics transport and all logs are content/context/URL/identifier safe;
- exact build identity is visible and agrees with the deployed commit;
- `@forge/kvs` legacy visibility, conditional entity behavior, manifest version impact, and the declaration-preserving rollback artifact are proven on the original non-production app;
- exact-SHA real-Forge UI evidence exists for success and failure paths;
- `pnpm validate`, the authoritative PR run, staging, PVT, and delta spot-check satisfy the WP1 lifecycle without merging or production promotion by default.
