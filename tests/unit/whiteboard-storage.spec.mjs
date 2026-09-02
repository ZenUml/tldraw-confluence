import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  createEmptyLegacyDocument,
  decodeLegacyValue,
  encodeLegacyDocument,
} from '@zenuml/whiteboard-codec';

import { createLegacyStorageHandlers } from '../../src/persistence/createLegacyStorageHandlers.mjs';

function sha256Hex(value) {
  return Promise.resolve(createHash('sha256').update(value, 'utf8').digest('hex'));
}

describe('Whiteboard legacy storage handlers', () => {
  it('returns a fixed recovery wrapper without writing or exposing the storage key', async () => {
    const stored = { compressedJson: 'synthetic-invalid-value' };
    const writes = [];
    const handlers = createLegacyStorageHandlers({
      documentStore: {
        get: async (key) => {
          expect(key).toBe('macro-local-id');
          return stored;
        },
        set: async (...args) => { writes.push(args); },
      },
      journalStore: { get: async () => undefined },
      sha256Hex,
    });

    const result = await handlers.readRecovery({
      context: { localId: 'ari:macro/macro-local-id' },
    });

    expect(result).toEqual({
      kind: 'recovery',
      recovery: {
        kind: 'whiteboard-recovery',
        formatVersion: 1,
        source: 'stored',
        value: stored,
      },
    });
    expect(JSON.stringify(result)).not.toContain('macro-local-id');
    expect(writes).toEqual([]);
  });

  it('loads a missing legacy slot at revision zero without writing', async () => {
    const documentWrites = [];
    const journalReads = [];
    const handlers = createLegacyStorageHandlers({
      documentStore: {
        get: async (key) => {
          expect(key).toBe('macro-local-id');
          return undefined;
        },
        set: async (...args) => { documentWrites.push(args); },
      },
      journalStore: {
        get: async (key) => {
          journalReads.push(key);
          return undefined;
        },
      },
      sha256Hex: async (value) => {
        expect(value).toBe('macro-local-id');
        return 'a'.repeat(64);
      },
    });

    await expect(handlers.loadDocument({
      context: { localId: 'ari:macro/macro-local-id' },
    })).resolves.toEqual({
      kind: 'missing',
      writeState: { revision: 0, token: 'm' },
    });
    expect(journalReads).toEqual([`wb.s1.${'a'.repeat(64)}`]);
    expect(documentWrites).toEqual([]);
  });

  it('loads a validated raw document with a revision-zero content token', async () => {
    const stored = createEmptyLegacyDocument();
    const handlers = createLegacyStorageHandlers({
      documentStore: {
        get: async () => stored,
        set: async () => { throw new Error('load must not write'); },
      },
      journalStore: { get: async () => undefined },
      sha256Hex,
    });

    const result = await handlers.loadDocument({
      context: { localId: 'ari:macro/macro-local-id' },
    });

    expect(result.kind).toBe('legacy-raw');
    expect(result.document).toEqual(stored);
    expect(result.writeState).toEqual({
      revision: 0,
      token: `r:${result.fingerprints.codec}`,
    });
  });

  it('freezes load when a pending journal requires explicit reconciliation', async () => {
    const pending = {
      schemaVersion: 1,
      revision: 3,
      state: 'pending',
      expectedToken: 'r:expected',
      candidateToken: 'c:candidate',
      writeId: 'write-1',
      compressedJson: 'candidate-base64',
    };
    const handlers = createLegacyStorageHandlers({
      documentStore: {
        get: async () => createEmptyLegacyDocument(),
        set: async () => { throw new Error('load must not write'); },
      },
      journalStore: { get: async () => pending },
      sha256Hex,
    });

    await expect(handlers.loadDocument({
      context: { localId: 'ari:macro/macro-local-id' },
    })).resolves.toEqual({
      kind: 'reconciliation-required',
      errorCode: 'storage_journal_pending',
      writeState: {
        revision: 3,
        expectedToken: 'r:expected',
        candidateToken: 'c:candidate',
        writeId: 'write-1',
      },
    });
  });

  it('loads against a confirmed journal only when its token matches storage', async () => {
    const stored = createEmptyLegacyDocument();
    const decoded = await decodeLegacyValue(stored, { sha256Hex });
    const currentToken = `r:${decoded.fingerprints.codec}`;
    const handlers = createLegacyStorageHandlers({
      documentStore: {
        get: async () => stored,
        set: async () => { throw new Error('load must not write'); },
      },
      journalStore: {
        get: async () => ({
          schemaVersion: 1,
          revision: 7,
          state: 'confirmed',
          currentToken,
          writeId: 'write-7',
        }),
      },
      sha256Hex,
    });

    const result = await handlers.loadDocument({
      context: { localId: 'ari:macro/macro-local-id' },
    });

    expect(result.kind).toBe('legacy-raw');
    expect(result.writeState).toEqual({ revision: 7, token: currentToken });
  });

  it('acquires, writes, verifies, and finalizes a first save in order', async () => {
    const candidate = encodeLegacyDocument(createEmptyLegacyDocument()).envelope;
    const calls = [];
    let storedValue;
    const handlers = createLegacyStorageHandlers({
      documentStore: {
        get: async () => {
          calls.push(['document.get']);
          return storedValue;
        },
        set: async (key, value) => {
          calls.push(['document.set', key]);
          storedValue = value;
        },
      },
      journalStore: {
        get: async () => undefined,
        acquire: async (key, pending, condition) => {
          calls.push(['journal.acquire', key, pending, condition]);
          return true;
        },
        finalize: async (key, confirmed, condition) => {
          calls.push(['journal.finalize', key, confirmed, condition]);
          return true;
        },
      },
      sha256Hex,
    });

    const result = await handlers.saveDocument({
      context: { localId: 'ari:macro/macro-local-id' },
      payload: {
        envelope: candidate,
        baseRevision: 0,
        expectedToken: 'm',
        writeId: 'write-1',
      },
    });
    const candidateToken = `c:${await sha256Hex(candidate.compressedJson)}`;

    expect(result).toEqual({
      kind: 'saved',
      revision: 1,
      token: candidateToken,
    });
    expect(calls.map(([name]) => name)).toEqual([
      'journal.acquire',
      'document.get',
      'document.set',
      'document.get',
      'journal.finalize',
    ]);
    expect(calls[0][2]).toEqual({
      schemaVersion: 1,
      revision: 1,
      state: 'pending',
      expectedToken: 'm',
      candidateToken,
      writeId: 'write-1',
      compressedJson: candidate.compressedJson,
    });
    expect(calls[0][3]).toEqual({ kind: 'missing-revision' });
    expect(calls[4][2]).toEqual({
      schemaVersion: 1,
      revision: 1,
      state: 'confirmed',
      currentToken: candidateToken,
      writeId: 'write-1',
    });
    expect(calls[4][3]).toEqual({ revision: 1, writeId: 'write-1' });
  });

  it('resumes a crash after the document write without rewriting the candidate', async () => {
    const candidate = encodeLegacyDocument(createEmptyLegacyDocument()).envelope;
    const candidateToken = `c:${await sha256Hex(candidate.compressedJson)}`;
    const pending = {
      schemaVersion: 1,
      revision: 4,
      state: 'pending',
      expectedToken: 'c:'.concat('a'.repeat(64)),
      candidateToken,
      writeId: 'write-4',
      compressedJson: candidate.compressedJson,
    };
    let documentWrites = 0;
    const finalized = [];
    const handlers = createLegacyStorageHandlers({
      documentStore: {
        get: async () => candidate,
        set: async () => { documentWrites += 1; },
      },
      journalStore: {
        get: async () => pending,
        finalize: async (...args) => {
          finalized.push(args);
          return true;
        },
      },
      sha256Hex,
    });

    await expect(handlers.resumeSave({
      context: { localId: 'ari:macro/macro-local-id' },
      payload: { writeId: 'write-4' },
    })).resolves.toEqual({
      kind: 'saved',
      revision: 4,
      token: candidateToken,
    });
    expect(documentWrites).toBe(0);
    expect(finalized).toEqual([[
      `wb.s1.${await sha256Hex('macro-local-id')}`,
      {
        schemaVersion: 1,
        revision: 4,
        state: 'confirmed',
        currentToken: candidateToken,
        writeId: 'write-4',
      },
      { revision: 4, writeId: 'write-4' },
    ]]);
  });
});
