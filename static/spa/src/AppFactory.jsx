import React from 'react';
import { Tldraw } from '@tldraw/tldraw';
import { Rnd } from 'react-rnd';
import {
  createEmptyLegacyDocument,
  encodeLegacyDocument,
  fingerprintLegacyDocument,
  validateLegacyDocument,
} from '@zenuml/whiteboard-codec';
import Debug from './Debug/Debug.jsx';
import WhiteboardErrorBoundary from './components/WhiteboardErrorBoundary.jsx';
import WhiteboardStatus from './components/WhiteboardStatus.jsx';
import { createOrderedSaveQueue } from './persistence/createOrderedSaveQueue.mjs';
import { whiteboardAnalytics } from './utils/analytics/analytics';

const DEFAULT_HEIGHT = 400;

const frameStyle = {
  display: 'flex',
  border: 'solid 1px #ddd',
  background: '#f0f0f0',
  position: 'relative',
  marginBottom: '10px',
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function durationBucket(milliseconds) {
  if (milliseconds < 100) return 'lt_100ms';
  if (milliseconds < 500) return '100_499ms';
  if (milliseconds < 2000) return '500_1999ms';
  if (milliseconds < 10000) return '2_9s';
  return 'gte_10s';
}

function sizeBucket(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (bytes < 1024) return 'lt_1_kib';
  if (bytes < 16 * 1024) return '1_15_kib';
  if (bytes < 64 * 1024) return '16_63_kib';
  if (bytes < 128 * 1024) return '64_127_kib';
  if (bytes < 240 * 1024) return '128_239_kib';
  return 'gte_240_kib';
}

function sourceFormat(kind) {
  if (kind === 'legacy-raw') return 'legacy_raw';
  if (kind === 'legacy-compressed') return 'legacy_compressed';
  return 'missing';
}

function errorPhase(result) {
  if (result?.kind === 'read-error') return 'kvs_read';
  if (result?.kind === 'invalid' || result?.kind === 'unsupported') return 'validate';
  if (result?.kind === 'reconciliation-required') return 'journal_read';
  return 'bridge';
}

function triggerDownload(recovery) {
  const blob = new Blob([JSON.stringify(recovery, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'whiteboard-recovery.json';
  anchor.click();
  URL.revokeObjectURL(url);
  return sizeBucket(recovery);
}

export default function createApp(invoke) {
  return function App() {
    const [loadState, setLoadState] = React.useState({ kind: 'loading' });
    const [saveState, setSaveState] = React.useState({ kind: 'confirmed' });
    const [height, setHeight] = React.useState(DEFAULT_HEIGHT);
    const [mountAttempt, setMountAttempt] = React.useState(0);
    const appRef = React.useRef(null);
    const armedRef = React.useRef(false);
    const queueRef = React.useRef(null);
    const unsavedRecoveryRef = React.useRef(null);
    const persistChainRef = React.useRef(Promise.resolve());

    const load = React.useCallback(async () => {
      const started = performance.now();
      armedRef.current = false;
      appRef.current = null;
      queueRef.current = null;
      unsavedRecoveryRef.current = null;
      setSaveState({ kind: 'confirmed' });
      setLoadState({ kind: 'loading' });
      whiteboardAnalytics.track('whiteboard_load_requested', { schema_target: '15.5' });

      let result;
      try {
        result = await invoke('load-document');
      } catch {
        result = { kind: 'bridge-error', errorCode: 'bridge_invoke_failed' };
      }

      if (result?.kind === 'missing' || result?.kind === 'legacy-raw' || result?.kind === 'legacy-compressed') {
        const document = result.kind === 'missing' ? createEmptyLegacyDocument() : result.document;
        const validation = validateLegacyDocument(document);
        if (validation.kind !== 'valid') {
          setLoadState({ kind: validation.kind, errorCode: validation.errorCode, canRecover: result.kind !== 'missing' });
          return;
        }
        const fingerprints = await fingerprintLegacyDocument(validation.value, sha256Hex);
        const writeState = result.writeState;
        if (!writeState || !Number.isInteger(writeState.revision) || typeof writeState.token !== 'string') {
          setLoadState({ kind: 'bridge-error', errorCode: 'bridge_invoke_failed' });
          return;
        }
        const nextHeight = validation.value.viewport?.height ?? DEFAULT_HEIGHT;
        setHeight(nextHeight);
        queueRef.current = createOrderedSaveQueue({
          initialWriteState: writeState,
          initialFingerprint: fingerprints.editor,
          createWriteId: () => crypto.randomUUID(),
          save: async (candidate, baseWriteState, writeId) => {
            const saveStarted = performance.now();
            let saveResult;
            try {
              saveResult = await invoke('save-document', {
                envelope: candidate.envelope,
                baseRevision: baseWriteState.revision,
                expectedToken: baseWriteState.token,
                writeId,
              });
            } catch {
              saveResult = {
                kind: 'reconciliation-required',
                errorCode: 'bridge_invoke_failed',
              };
            }
            if (saveResult?.kind === 'saved') {
              whiteboardAnalytics.track('whiteboard_save_succeeded', {
                change_source: candidate.changeSource,
                duration_bucket: durationBucket(performance.now() - saveStarted),
                size_bucket: candidate.sizeBucket,
                coalesced_bucket: '0',
              });
              if (candidate.changeSource === 'resize') {
                whiteboardAnalytics.track('whiteboard_resize_succeeded', { size_bucket: candidate.sizeBucket });
              }
            } else {
              whiteboardAnalytics.track('whiteboard_save_failed', {
                phase: errorPhase(saveResult),
                error_code: saveResult?.errorCode || 'bridge_invoke_failed',
                retryable: saveResult?.kind !== 'conflict',
              });
            }
            return saveResult;
          },
          onStateChange: setSaveState,
        });
        setLoadState({
          kind: 'mount-probing',
          document: deepClone(validation.value),
          fingerprint: fingerprints.mount,
          sourceFormat: sourceFormat(result.kind),
          started,
        });
        setMountAttempt((value) => value + 1);
        return;
      }

      const errorCode = result?.errorCode || 'bridge_invoke_failed';
      const kind = result?.kind || 'bridge-error';
      setLoadState({
        kind,
        errorCode,
        writeState: result?.writeState,
        canRecover: kind === 'invalid' || kind === 'unsupported',
      });
      whiteboardAnalytics.track('whiteboard_load_failed', {
        phase: errorPhase(result),
        error_code: errorCode,
        source_format: kind === 'invalid' ? 'stored_invalid' : kind === 'unsupported' ? 'stored_unsupported' : 'unknown',
      });
    }, [invoke]);

    React.useEffect(() => { void load(); }, [load]);

    const probeMount = React.useCallback((app) => {
      appRef.current = app;
      requestAnimationFrame(() => requestAnimationFrame(async () => {
        if (loadState.kind !== 'mount-probing' || appRef.current !== app) return;
        const validation = validateLegacyDocument(deepClone(app.document));
        if (validation.kind !== 'valid') {
          setLoadState({ kind: validation.kind, errorCode: validation.errorCode, canRecover: true });
          return;
        }
        const fingerprints = await fingerprintLegacyDocument(validation.value, sha256Hex);
        if (fingerprints.mount !== loadState.fingerprint) {
          setLoadState({ kind: 'invalid', errorCode: 'editor_migration_changed_persistent_data', canRecover: true });
          return;
        }
        armedRef.current = true;
        setLoadState({ kind: 'ready', document: loadState.document, sourceFormat: loadState.sourceFormat });
        whiteboardAnalytics.track('whiteboard_load_succeeded', {
          source_format: loadState.sourceFormat,
          duration_bucket: durationBucket(performance.now() - loadState.started),
          size_bucket: sizeBucket(loadState.document),
        });
      }));
    }, [loadState]);

    const enqueueDocument = React.useCallback((document, nextHeight, changeSource) => {
      if (!armedRef.current || !queueRef.current) return;
      persistChainRef.current = persistChainRef.current.then(async () => {
        const snapshot = deepClone(document);
        snapshot.viewport = { height: nextHeight };
        const validation = validateLegacyDocument(snapshot);
        if (validation.kind !== 'valid') {
          armedRef.current = false;
          unsavedRecoveryRef.current = snapshot;
          setSaveState({ kind: 'blocked', result: { kind: validation.kind, errorCode: 'save_validation_failed' } });
          return;
        }
        const fingerprints = await fingerprintLegacyDocument(validation.value, sha256Hex);
        const encoded = encodeLegacyDocument(validation.value);
        if (encoded.kind !== 'encoded') {
          armedRef.current = false;
          unsavedRecoveryRef.current = snapshot;
          setSaveState({ kind: 'blocked', result: encoded });
          return;
        }
        const bucket = sizeBucket(encoded.envelope);
        whiteboardAnalytics.track('whiteboard_save_requested', {
          change_source: changeSource,
          target_schema: '15.5',
          size_bucket: bucket,
        });
        queueRef.current.enqueue({
          fingerprint: fingerprints.editor,
          envelope: encoded.envelope,
          document: validation.value,
          changeSource,
          sizeBucket: bucket,
        });
      });
    }, []);

    const onPersist = React.useCallback((app) => {
      enqueueDocument(app.document, height, 'editor');
    }, [enqueueDocument, height]);

    const resume = React.useCallback(async () => {
      const writeId = loadState.writeState?.writeId || saveState.writeId;
      if (!writeId) return;
      whiteboardAnalytics.track('whiteboard_save_reconciliation_requested', { phase: 'journal_read' });
      let result;
      try {
        result = await invoke('resume-save', { writeId });
      } catch {
        result = { kind: 'read-error', errorCode: 'bridge_invoke_failed' };
      }
      if (saveState.kind === 'reconciliation-required' && result?.kind === 'saved') {
        queueRef.current?.confirmReconciliation(result);
      }
      await load();
    }, [invoke, load, loadState, saveState]);

    const downloadRecovery = React.useCallback(async () => {
      const source = loadState.kind === 'invalid' ? 'stored_invalid' : 'stored_unsupported';
      whiteboardAnalytics.track('whiteboard_recovery_download_requested', {
        source_format: source,
        reason_code: loadState.errorCode,
      });
      try {
        const result = await invoke('download-recovery');
        if (result?.kind !== 'recovery') throw new Error('recovery unavailable');
        const bucket = triggerDownload(result.recovery);
        whiteboardAnalytics.track('whiteboard_recovery_download_succeeded', {
          source_format: source,
          size_bucket: bucket,
        });
      } catch {
        whiteboardAnalytics.track('whiteboard_recovery_download_failed', {
          phase: 'recovery_read',
          error_code: 'recovery_download_failed',
        });
      }
    }, [invoke, loadState]);

    const downloadUnsavedRecovery = React.useCallback(() => {
      const candidate = queueRef.current?.getRecoveryCandidate();
      const document = candidate?.document || unsavedRecoveryRef.current;
      if (!document) return;
      const reasonCode = saveState.result?.errorCode || 'save_validation_failed';
      whiteboardAnalytics.track('whiteboard_recovery_download_requested', {
        source_format: 'unsaved',
        reason_code: reasonCode,
      });
      try {
        const bucket = triggerDownload({
          kind: 'whiteboard-recovery',
          formatVersion: 1,
          source: 'unsaved',
          value: document,
        });
        whiteboardAnalytics.track('whiteboard_recovery_download_succeeded', {
          source_format: 'unsaved',
          size_bucket: bucket,
        });
      } catch {
        whiteboardAnalytics.track('whiteboard_recovery_download_failed', {
          phase: 'blob_create',
          error_code: 'recovery_download_failed',
        });
      }
    }, [saveState]);

    const editorVisible = loadState.kind === 'ready';
    const editorMounted = loadState.kind === 'mount-probing' || editorVisible;
    return (
      <div>
        <Rnd
          enableResizing={{ bottom: editorVisible }}
          disableDragging
          className="flex flex-col"
          style={frameStyle}
          size={{ height: `${height}px`, width: '100%' }}
          minHeight={200}
          maxHeight={4096}
          onResizeStop={(_event, _direction, ref) => {
            const nextHeight = Math.max(200, Math.min(4096, Number.parseFloat(ref.style.height)));
            setHeight(nextHeight);
            if (appRef.current) enqueueDocument(appRef.current.document, nextHeight, 'resize');
          }}
        >
          <Debug />
          <WhiteboardStatus
            loadState={loadState}
            saveState={saveState}
            onRetry={() => saveState.kind === 'failed' ? queueRef.current?.retry() : void load()}
            onResume={resume}
            onRecovery={downloadRecovery}
            onSaveRecovery={downloadUnsavedRecovery}
          />
          {editorMounted && (
            <div
              key={mountAttempt}
              className="relative flex flex-grow"
              style={{ visibility: editorVisible ? 'visible' : 'hidden', pointerEvents: editorVisible ? 'auto' : 'none' }}
            >
              <WhiteboardErrorBoundary>
                <Tldraw
                  showMultiplayerMenu={false}
                  disableAssets
                  readOnly={!editorVisible || ['reconciliation-required', 'failed', 'blocked'].includes(saveState.kind)}
                  onMount={probeMount}
                  onPersist={onPersist}
                  document={loadState.document}
                />
              </WhiteboardErrorBoundary>
            </div>
          )}
        </Rnd>
      </div>
    );
  };
}
