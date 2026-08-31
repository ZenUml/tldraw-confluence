# Whiteboard persistence safety policy

Forge KVS is the system of record for Whiteboard bodies during the renovation and
the later `conf-app` codebase merge. Persistence redesign is never an incidental
toolchain or SDK change.

## Compatibility contracts

- Preserve Forge app ID `368b610d-bac1-4e2a-9311-6ec0adca5e49` and macro key
  `whiteboard`.
- Preserve the legacy key: the final segment of `context.localId`.
- Preserve existing app-scoped KVS values during WP1.
- Recognize that current main reads a raw object with a truthy `id` or an LZUTF8
  Base64 `{compressedJson}` envelope. Obsolete resolver operations may have written
  unsupported arrays.
- Do not silently adopt a format found only on an unmerged branch.

## Required behavior for WP2 and later

Reads return distinct outcomes for confirmed missing data, read failure, invalid
data, unsupported data, and a validated document. Only confirmed missing data may
lead to a new board.

Loading, decoding, validation, and in-memory conversion are pure operations: they
perform zero writes. The editable canvas must not mount until persistence is ready.
Read errors, invalid values, unsupported arrays, and unsupported asset-bearing
documents fail closed and leave the original KVS value untouched.

Writes must:

- follow an explicit user edit or resize;
- be encoded and validated before KVS access;
- be awaited and ordered so an older request cannot overwrite newer state;
- distinguish dirty, saving, confirmed, and failed state;
- expose a retryable failure without clearing the canvas;
- preserve pages, shapes, bindings, page state, viewport, unknown fields, and assets
  unless a separately approved contract says otherwise.

Disabling creation of new assets does not authorize deleting stored assets. Until an
asset persistence design exists, a non-empty legacy asset map is unsupported and
must remain untouched.

## Migration boundary

CRA-to-Vite migration must not change key derivation or value formats. A future modern
SDK uses a separately designed, versioned KVS slot and dual-read logic. Loading a
legacy value alone never writes a modern value.

The legacy slot is a pre-upgrade source copy; it does not contain later modern edits.
Therefore modern writes are forward-only unless a tested downgrade path exists.
Emergency releases after modern edits must retain the modern decoder and slot.

Every migration requires synthetic golden fixtures, semantic comparison, storage
failure tests, real Forge UI evidence, and an explicit rollback/forward-recovery
decision before production promotion.

## Privacy

Never log or emit document bodies, shape content, raw JSON, compressed payloads,
complete Forge context, local IDs, tenant identifiers, or raw exceptions. Use stable
outcome and error codes only.
