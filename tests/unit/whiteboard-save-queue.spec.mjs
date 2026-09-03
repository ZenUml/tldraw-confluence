import { describe, expect, it } from 'vitest';

import { createOrderedSaveQueue } from '../../static/spa/src/persistence/createOrderedSaveQueue.mjs';

describe('Whiteboard ordered save queue', () => {
  it('coalesces rapid edits but preserves an undo behind an in-flight save', async () => {
    let releaseFirst;
    const firstBlocked = new Promise((resolve) => { releaseFirst = resolve; });
    const writes = [];
    const queue = createOrderedSaveQueue({
      initialWriteState: { revision: 0, token: 'm' },
      initialFingerprint: 'X',
      createWriteId: (() => {
        let next = 1;
        return () => `write-${next++}`;
      })(),
      save: async (candidate, writeState, writeId) => {
        writes.push({ fingerprint: candidate.fingerprint, writeState, writeId });
        if (writes.length === 1) await firstBlocked;
        return {
          kind: 'saved',
          revision: writeState.revision + 1,
          token: `token-${writes.length}`,
        };
      },
    });

    queue.enqueue({ fingerprint: 'A', envelope: { compressedJson: 'A' } });
    queue.enqueue({ fingerprint: 'B', envelope: { compressedJson: 'B' } });
    queue.enqueue({ fingerprint: 'X', envelope: { compressedJson: 'X' } });
    releaseFirst();
    await queue.whenIdle();

    expect(writes).toEqual([
      {
        fingerprint: 'A',
        writeState: { revision: 0, token: 'm' },
        writeId: 'write-1',
      },
      {
        fingerprint: 'X',
        writeState: { revision: 1, token: 'token-1' },
        writeId: 'write-2',
      },
    ]);
    expect(queue.getState()).toMatchObject({
      kind: 'confirmed',
      confirmedFingerprint: 'X',
      writeState: { revision: 2, token: 'token-2' },
    });
  });

  it('blocks conflicts without force-retry and retains the newest recovery snapshot', async () => {
    const candidate = { fingerprint: 'A', document: { id: 'synthetic' } };
    const queue = createOrderedSaveQueue({
      initialWriteState: { revision: 4, token: 'c:old' },
      initialFingerprint: 'X',
      createWriteId: () => 'write-5',
      save: async () => ({ kind: 'conflict', errorCode: 'storage_conflict' }),
    });

    queue.enqueue(candidate);
    await queue.whenIdle();

    expect(queue.getState()).toMatchObject({
      kind: 'blocked',
      result: { kind: 'conflict', errorCode: 'storage_conflict' },
      writeId: 'write-5',
    });
    expect(queue.retry()).toBe(false);
    expect(queue.getRecoveryCandidate()).toBe(candidate);
  });

  it('reconciles the same interrupted write before draining a newer snapshot', async () => {
    const writes = [];
    const queue = createOrderedSaveQueue({
      initialWriteState: { revision: 0, token: 'm' },
      initialFingerprint: 'X',
      createWriteId: (() => {
        let next = 1;
        return () => `write-${next++}`;
      })(),
      save: async (candidate, writeState, writeId) => {
        writes.push({ candidate, writeState, writeId });
        if (writes.length === 1) {
          return { kind: 'reconciliation-required', errorCode: 'kvs_write_failed' };
        }
        return { kind: 'saved', revision: 2, token: 'c:newest' };
      },
    });

    queue.enqueue({ fingerprint: 'A', document: { value: 'A' } });
    await queue.whenIdle();
    queue.enqueue({ fingerprint: 'C', document: { value: 'C' } });
    expect(queue.getState()).toMatchObject({
      kind: 'reconciliation-required',
      writeId: 'write-1',
    });
    expect(queue.confirmReconciliation({ kind: 'saved', revision: 1, token: 'c:A' })).toBe(true);
    await queue.whenIdle();

    expect(writes.map(({ candidate, writeId }) => [candidate.fingerprint, writeId])).toEqual([
      ['A', 'write-1'],
      ['C', 'write-2'],
    ]);
  });
});
