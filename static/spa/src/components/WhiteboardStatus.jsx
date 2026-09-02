const labels = {
  loading: 'Loading whiteboard…',
  'mount-probing': 'Checking whiteboard data…',
  saving: 'Saving…',
  confirmed: 'Saved',
  failed: 'Save failed',
  blocked: 'Saving is blocked to protect your data',
  'reconciliation-required': 'An interrupted save needs attention',
};

export default function WhiteboardStatus({ loadState, saveState, onRetry, onResume, onRecovery, onSaveRecovery }) {
  if (loadState.kind === 'ready') {
    if (!saveState || saveState.kind === 'confirmed') return null;
    return (
      <div role="status" data-testid="whiteboard-save-status" className="absolute bottom-2 left-2 z-50 rounded bg-white px-3 py-2 text-xs shadow">
        <span>{labels[saveState.kind] || 'Whiteboard status changed'}</span>
        {saveState.kind === 'failed' && <button className="ml-2 underline" onClick={onRetry}>Retry</button>}
        {saveState.kind === 'reconciliation-required' && <button className="ml-2 underline" onClick={onResume}>Resume interrupted save</button>}
        {saveState.kind === 'blocked' && <button className="ml-2 underline" onClick={onSaveRecovery}>Download unsaved recovery file</button>}
      </div>
    );
  }

  if (loadState.kind === 'loading' || loadState.kind === 'mount-probing') {
    return <div role="status" className="flex h-full items-center justify-center text-sm">{labels[loadState.kind]}</div>;
  }

  const canRecover = Boolean(loadState.canRecover);
  const canRetry = loadState.kind === 'read-error' || loadState.kind === 'bridge-error';
  const canResume = loadState.kind === 'reconciliation-required';
  return (
    <div role="alert" data-testid="whiteboard-load-error" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <strong>Whiteboard could not be opened safely.</strong>
      <span className="text-sm">Your stored data has not been changed. ({loadState.errorCode})</span>
      <div className="flex gap-3 text-sm">
        {canRetry && <button className="rounded border px-3 py-1" onClick={onRetry}>Retry</button>}
        {canResume && <button className="rounded border px-3 py-1" onClick={onResume}>Resume interrupted save</button>}
        {canRecover && <button className="rounded border px-3 py-1" onClick={onRecovery}>Download recovery file</button>}
      </div>
    </div>
  );
}
