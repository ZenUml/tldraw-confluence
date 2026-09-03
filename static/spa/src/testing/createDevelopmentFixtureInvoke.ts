import {
  decodeLegacyValue,
  createEmptyLegacyDocument,
} from '@zenuml/whiteboard-codec';

const ALLOWED_FIXTURES = new Set(['missing', 'invalid', 'read-error', 'pending', 'legacy-raw']);

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createDevelopmentFixtureInvoke(fixtureName: string) {
  if (!import.meta.env.DEV || !ALLOWED_FIXTURES.has(fixtureName)) {
    throw new Error('Unsupported development fixture');
  }
  const fixtureStorageKey = `whiteboard-development-fixture:${fixtureName}`;
  const persistedFixtureValue = sessionStorage.getItem(fixtureStorageKey);
  let stored: unknown = persistedFixtureValue === null
    ? fixtureName === 'legacy-raw' ? createEmptyLegacyDocument() : undefined
    : JSON.parse(persistedFixtureValue);
  let revision = 0;
  let token = 'm';
  const counts: Record<string, number> = {};
  window.__WHITEBOARD_FIXTURE_COUNTS__ = counts;

  return async (operation: string, payload?: Record<string, unknown>) => {
    counts[operation] = (counts[operation] ?? 0) + 1;
    if (operation === 'load-document') {
      if (fixtureName === 'invalid') return { kind: 'invalid', errorCode: 'document_schema_invalid' };
      if (fixtureName === 'read-error') return { kind: 'read-error', errorCode: 'kvs_read_failed' };
      if (fixtureName === 'pending') {
        return {
          kind: 'reconciliation-required',
          errorCode: 'storage_journal_pending',
          writeState: { revision: 1, writeId: 'synthetic-write' },
        };
      }
      if (stored === undefined) return { kind: 'missing', writeState: { revision, token } };
      const decoded = await decodeLegacyValue(stored, { sha256Hex });
      return { ...decoded, writeState: { revision, token } };
    }
    if (operation === 'save-document') {
      const envelope = payload?.envelope;
      const decoded = await decodeLegacyValue(envelope, { sha256Hex });
      if (decoded.kind !== 'legacy-compressed') return { kind: 'invalid', errorCode: 'save_validation_failed' };
      stored = envelope;
      sessionStorage.setItem(fixtureStorageKey, JSON.stringify(envelope));
      revision += 1;
      token = `c:${await sha256Hex((envelope as { compressedJson: string }).compressedJson)}`;
      return { kind: 'saved', revision, token };
    }
    if (operation === 'resume-save') return { kind: 'not-acquired' };
    if (operation === 'download-recovery') {
      const value = fixtureName === 'invalid' ? { syntheticInvalid: true } : stored;
      return {
        kind: 'recovery',
        recovery: { kind: 'whiteboard-recovery', formatVersion: 1, source: 'stored', value },
      };
    }
    throw new Error('Unsupported development operation');
  };
}
