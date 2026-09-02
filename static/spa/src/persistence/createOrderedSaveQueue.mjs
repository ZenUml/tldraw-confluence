export function createOrderedSaveQueue({
  initialWriteState,
  initialFingerprint,
  createWriteId,
  save,
  onStateChange = () => {},
}) {
  let writeState = initialWriteState;
  let confirmedFingerprint = initialFingerprint;
  let pending;
  let inFlight;
  let stopped;
  let draining = false;
  let idleWaiters = [];

  const snapshotState = () => {
    if (stopped) {
      return {
        kind: stopped.result.kind === 'reconciliation-required'
          ? 'reconciliation-required'
          : stopped.result.kind === 'write-error'
            ? 'failed'
            : 'blocked',
        result: stopped.result,
        writeId: stopped.writeId,
        writeState,
        confirmedFingerprint,
      };
    }
    if (inFlight) {
      return {
        kind: 'saving',
        writeId: inFlight.writeId,
        writeState,
        confirmedFingerprint,
        hasPending: pending !== undefined,
      };
    }
    return { kind: 'confirmed', writeState, confirmedFingerprint };
  };

  const publish = () => onStateChange(snapshotState());
  const resolveIdle = () => {
    if (draining || inFlight || pending) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  };

  async function drain() {
    if (draining || stopped) return;
    draining = true;
    try {
      while (pending && !stopped) {
        const candidate = pending;
        pending = undefined;
        if (candidate.fingerprint === confirmedFingerprint) {
          continue;
        }
        const writeId = createWriteId();
        inFlight = { candidate, writeId };
        publish();
        let result;
        try {
          result = await save(candidate, writeState, writeId);
        } catch {
          result = { kind: 'write-error', errorCode: 'bridge_invoke_failed' };
        }
        if (result?.kind === 'saved') {
          writeState = { revision: result.revision, token: result.token };
          confirmedFingerprint = candidate.fingerprint;
          inFlight = undefined;
          publish();
          continue;
        }
        stopped = { candidate, result, writeId };
        inFlight = undefined;
        publish();
      }
    } finally {
      draining = false;
      resolveIdle();
    }
  }

  return {
    enqueue(candidate) {
      if (!candidate || typeof candidate.fingerprint !== 'string') return false;
      if (!inFlight && !stopped && candidate.fingerprint === confirmedFingerprint) {
        return false;
      }
      pending = candidate;
      publish();
      void drain();
      return true;
    },
    getState: snapshotState,
    retry() {
      if (!stopped || stopped.result.kind !== 'write-error') return false;
      pending = stopped.candidate;
      stopped = undefined;
      publish();
      void drain();
      return true;
    },
    confirmReconciliation(result) {
      if (!stopped || result?.kind !== 'saved') return false;
      writeState = { revision: result.revision, token: result.token };
      confirmedFingerprint = stopped.candidate.fingerprint;
      stopped = undefined;
      publish();
      void drain();
      return true;
    },
    getRecoveryCandidate() {
      return stopped?.candidate;
    },
    whenIdle() {
      if (!draining && !inFlight && !pending) return Promise.resolve();
      return new Promise((resolve) => { idleWaiters.push(resolve); });
    },
  };
}
