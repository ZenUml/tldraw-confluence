import {
  decodeLegacyValue,
  deriveLegacyKey,
} from '@zenuml/whiteboard-codec';
import { TextEncoder } from 'node:util';

function journalKeyFor(hash) {
  return `wb.s1.${hash}`;
}

const MAX_STORED_VALUE_BYTES = 240 * 1024;
const MAX_REVISION = 2_147_483_647;
const utf8Encoder = new TextEncoder();

function pendingWriteState(pending) {
  return {
    revision: pending.revision,
    expectedToken: pending.expectedToken,
    candidateToken: pending.candidateToken,
    writeId: pending.writeId,
  };
}

async function tokenForStoredValue(storedValue, sha256Hex) {
  const decoded = await decodeLegacyValue(storedValue, { sha256Hex });
  if (decoded.kind === 'missing') {
    return { decoded, token: 'm' };
  }
  if (decoded.kind === 'legacy-raw') {
    return { decoded, token: `r:${decoded.fingerprints.codec}` };
  }
  if (decoded.kind === 'legacy-compressed') {
    return {
      decoded,
      token: `c:${await sha256Hex(storedValue.compressedJson)}`,
    };
  }
  return { decoded };
}

function isValidSavePayload(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }
  return Number.isInteger(payload.baseRevision)
    && payload.baseRevision >= 0
    && payload.baseRevision < MAX_REVISION
    && typeof payload.expectedToken === 'string'
    && /^(?:m|[rc]:[a-f0-9]{64})$/.test(payload.expectedToken)
    && typeof payload.writeId === 'string'
    && payload.writeId.length > 0
    && payload.writeId.length <= 128;
}

function isPendingJournal(value) {
  return value !== null
    && typeof value === 'object'
    && value.schemaVersion === 1
    && Number.isInteger(value.revision)
    && value.revision > 0
    && value.revision <= 2_147_483_647
    && value.state === 'pending'
    && typeof value.expectedToken === 'string'
    && typeof value.candidateToken === 'string'
    && typeof value.writeId === 'string'
    && value.writeId.length > 0
    && typeof value.compressedJson === 'string'
    && value.compressedJson.length > 0
    && Object.keys(value).length === 7;
}

function isConfirmedJournal(value) {
  return value !== null
    && typeof value === 'object'
    && value.schemaVersion === 1
    && Number.isInteger(value.revision)
    && value.revision > 0
    && value.revision <= 2_147_483_647
    && value.state === 'confirmed'
    && typeof value.currentToken === 'string'
    && value.currentToken.length > 0
    && typeof value.writeId === 'string'
    && value.writeId.length > 0
    && Object.keys(value).length === 5;
}

export function createLegacyStorageHandlers({
  documentStore,
  journalStore,
  sha256Hex,
}) {
  return {
    async readRecovery({ context }) {
      const legacyKey = deriveLegacyKey(context);
      if (legacyKey.kind !== 'valid') return legacyKey;
      try {
        const value = await documentStore.get(legacyKey.key);
        return {
          kind: 'recovery',
          recovery: {
            kind: 'whiteboard-recovery',
            formatVersion: 1,
            source: 'stored',
            value,
          },
        };
      } catch {
        return { kind: 'read-error', errorCode: 'kvs_read_failed' };
      }
    },

    async loadDocument({ context }) {
      const legacyKey = deriveLegacyKey(context);
      if (legacyKey.kind !== 'valid') return legacyKey;
      const journalKey = journalKeyFor(await sha256Hex(legacyKey.key));
      let journal;
      let storedValue;
      try {
        [journal, storedValue] = await Promise.all([
          journalStore.get(journalKey),
          documentStore.get(legacyKey.key),
        ]);
      } catch {
        return { kind: 'read-error', errorCode: 'kvs_read_failed' };
      }
      if (isPendingJournal(journal)) {
        return {
          kind: 'reconciliation-required',
          errorCode: 'storage_journal_pending',
          writeState: pendingWriteState(journal),
        };
      }
      if (journal !== undefined && !isConfirmedJournal(journal)) {
        return { kind: 'conflict', errorCode: 'storage_conflict' };
      }
      const { decoded, token } = await tokenForStoredValue(storedValue, sha256Hex);
      const revision = journal?.revision ?? 0;
      const addWriteState = (result) => {
        if (journal && journal.currentToken !== token) {
          return { kind: 'conflict', errorCode: 'storage_conflict' };
        }
        return {
          ...result,
          writeState: { revision, token },
        };
      };
      if (decoded.kind === 'missing') {
        return addWriteState(decoded);
      }
      if (decoded.kind === 'legacy-raw') {
        return addWriteState(decoded);
      }
      if (decoded.kind === 'legacy-compressed') {
        return addWriteState(decoded);
      }
      return decoded;
    },

    async saveDocument({ context, payload }) {
      const legacyKey = deriveLegacyKey(context);
      if (legacyKey.kind !== 'valid') return legacyKey;
      if (!isValidSavePayload(payload)) {
        return { kind: 'invalid', errorCode: 'save_validation_failed' };
      }

      const candidate = await decodeLegacyValue(payload.envelope, { sha256Hex });
      if (candidate.kind !== 'legacy-compressed') {
        if (candidate.kind === 'unsupported') return candidate;
        return { kind: 'invalid', errorCode: 'save_validation_failed' };
      }

      const journalKey = journalKeyFor(await sha256Hex(legacyKey.key));
      const candidateToken = `c:${await sha256Hex(payload.envelope.compressedJson)}`;
      const revision = payload.baseRevision + 1;
      const pending = {
        schemaVersion: 1,
        revision,
        state: 'pending',
        expectedToken: payload.expectedToken,
        candidateToken,
        writeId: payload.writeId,
        compressedJson: payload.envelope.compressedJson,
      };
      if (utf8Encoder.encode(JSON.stringify(pending)).byteLength > MAX_STORED_VALUE_BYTES) {
        return { kind: 'unsupported', errorCode: 'payload_too_large' };
      }
      const acquireCondition = payload.baseRevision === 0
        ? { kind: 'missing-revision' }
        : { kind: 'confirmed-revision', revision: payload.baseRevision };

      let acquired;
      try {
        acquired = await journalStore.acquire(journalKey, pending, acquireCondition);
      } catch {
        return {
          kind: 'reconciliation-required',
          errorCode: 'storage_journal_pending',
          writeState: pendingWriteState(pending),
        };
      }
      if (!acquired) {
        return { kind: 'conflict', errorCode: 'storage_conflict' };
      }

      let storedBefore;
      try {
        storedBefore = await documentStore.get(legacyKey.key);
      } catch {
        return {
          kind: 'reconciliation-required',
          errorCode: 'kvs_read_failed',
          writeState: pendingWriteState(pending),
        };
      }
      const before = await tokenForStoredValue(storedBefore, sha256Hex);
      if (before.token !== payload.expectedToken) {
        return {
          kind: 'conflict',
          errorCode: 'storage_conflict',
          writeState: pendingWriteState(pending),
        };
      }

      try {
        await documentStore.set(legacyKey.key, payload.envelope);
      } catch {
        return {
          kind: 'reconciliation-required',
          errorCode: 'kvs_write_failed',
          writeState: pendingWriteState(pending),
        };
      }

      let storedAfter;
      try {
        storedAfter = await documentStore.get(legacyKey.key);
      } catch {
        return {
          kind: 'reconciliation-required',
          errorCode: 'kvs_read_failed',
          writeState: pendingWriteState(pending),
        };
      }
      const after = await tokenForStoredValue(storedAfter, sha256Hex);
      if (after.token !== candidateToken) {
        return {
          kind: 'conflict',
          errorCode: 'storage_conflict',
          writeState: pendingWriteState(pending),
        };
      }

      const confirmed = {
        schemaVersion: 1,
        revision,
        state: 'confirmed',
        currentToken: candidateToken,
        writeId: payload.writeId,
      };
      try {
        const finalized = await journalStore.finalize(
          journalKey,
          confirmed,
          { revision, writeId: payload.writeId },
        );
        if (!finalized) {
          return {
            kind: 'reconciliation-required',
            errorCode: 'storage_journal_finalize_failed',
            writeState: pendingWriteState(pending),
          };
        }
      } catch {
        return {
          kind: 'reconciliation-required',
          errorCode: 'storage_journal_finalize_failed',
          writeState: pendingWriteState(pending),
        };
      }

      return { kind: 'saved', revision, token: candidateToken };
    },

    async resumeSave({ context, payload }) {
      const legacyKey = deriveLegacyKey(context);
      if (legacyKey.kind !== 'valid') return legacyKey;
      if (payload === null
        || typeof payload !== 'object'
        || typeof payload.writeId !== 'string'
        || payload.writeId.length === 0
        || payload.writeId.length > 128) {
        return { kind: 'invalid', errorCode: 'save_validation_failed' };
      }

      const journalKey = journalKeyFor(await sha256Hex(legacyKey.key));
      let pending;
      try {
        pending = await journalStore.get(journalKey);
      } catch {
        return { kind: 'read-error', errorCode: 'kvs_read_failed' };
      }
      if (pending === undefined) {
        return { kind: 'not-acquired' };
      }
      if (isConfirmedJournal(pending)) {
        if (pending.writeId !== payload.writeId) {
          return { kind: 'conflict', errorCode: 'storage_conflict' };
        }
        let confirmedValue;
        try {
          confirmedValue = await documentStore.get(legacyKey.key);
        } catch {
          return { kind: 'read-error', errorCode: 'kvs_read_failed' };
        }
        const confirmedDocument = await tokenForStoredValue(confirmedValue, sha256Hex);
        if (confirmedDocument.token !== pending.currentToken) {
          return { kind: 'conflict', errorCode: 'storage_conflict' };
        }
        return {
          kind: 'saved',
          revision: pending.revision,
          token: pending.currentToken,
        };
      }
      if (!isPendingJournal(pending) || pending.writeId !== payload.writeId) {
        return { kind: 'conflict', errorCode: 'storage_conflict' };
      }

      const envelope = { compressedJson: pending.compressedJson };
      const candidate = await decodeLegacyValue(envelope, { sha256Hex });
      const candidateToken = `c:${await sha256Hex(pending.compressedJson)}`;
      if (candidate.kind !== 'legacy-compressed' || candidateToken !== pending.candidateToken) {
        return { kind: 'conflict', errorCode: 'storage_conflict' };
      }

      let storedValue;
      try {
        storedValue = await documentStore.get(legacyKey.key);
      } catch {
        return {
          kind: 'reconciliation-required',
          errorCode: 'kvs_read_failed',
          writeState: pendingWriteState(pending),
        };
      }
      let current = await tokenForStoredValue(storedValue, sha256Hex);
      if (current.token === pending.expectedToken) {
        try {
          await documentStore.set(legacyKey.key, envelope);
          storedValue = await documentStore.get(legacyKey.key);
          current = await tokenForStoredValue(storedValue, sha256Hex);
        } catch {
          return {
            kind: 'reconciliation-required',
            errorCode: 'kvs_write_failed',
            writeState: pendingWriteState(pending),
          };
        }
      }
      if (current.token !== candidateToken) {
        return {
          kind: 'conflict',
          errorCode: 'storage_conflict',
          writeState: pendingWriteState(pending),
        };
      }

      const confirmed = {
        schemaVersion: 1,
        revision: pending.revision,
        state: 'confirmed',
        currentToken: candidateToken,
        writeId: pending.writeId,
      };
      try {
        const finalized = await journalStore.finalize(
          journalKey,
          confirmed,
          { revision: pending.revision, writeId: pending.writeId },
        );
        if (!finalized) {
          return {
            kind: 'reconciliation-required',
            errorCode: 'storage_journal_finalize_failed',
            writeState: pendingWriteState(pending),
          };
        }
      } catch {
        return {
          kind: 'reconciliation-required',
          errorCode: 'storage_journal_finalize_failed',
          writeState: pendingWriteState(pending),
        };
      }
      return {
        kind: 'saved',
        revision: pending.revision,
        token: candidateToken,
      };
    },
  };
}
