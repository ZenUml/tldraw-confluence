const DURATION_BUCKETS = [
  'lt_100ms',
  '100_499ms',
  '500_1999ms',
  '2_9s',
  'gte_10s',
] as const;

const SIZE_BUCKETS = [
  'lt_1_kib',
  '1_15_kib',
  '16_63_kib',
  '64_127_kib',
  '128_239_kib',
  'gte_240_kib',
] as const;

const PHASES = [
  'context',
  'journal_read',
  'kvs_read',
  'decode',
  'validate',
  'mount',
  'bridge',
  'journal_acquire',
  'kvs_write',
  'journal_finalize',
  'recovery_read',
  'blob_create',
] as const;

const ERROR_CODES = [
  'invalid_local_id',
  'kvs_read_failed',
  'legacy_array_unsupported',
  'compressed_envelope_unsupported',
  'compressed_base64_invalid',
  'compressed_json_invalid',
  'document_schema_invalid',
  'document_version_unsupported',
  'document_feature_unsupported',
  'assets_unsupported',
  'shape_type_unsupported',
  'binding_unsupported',
  'viewport_height_invalid',
  'payload_too_large',
  'document_too_complex',
  'editor_migration_changed_persistent_data',
  'save_validation_failed',
  'storage_conflict',
  'storage_journal_pending',
  'storage_journal_finalize_failed',
  'storage_revision_exhausted',
  'legacy_client_reload_required',
  'kvs_write_failed',
  'bridge_invoke_failed',
  'recovery_download_failed',
  'editor_render_failed',
] as const;

const LOAD_SOURCE_FORMATS = ['missing', 'legacy_raw', 'legacy_compressed'] as const;
const FAILURE_SOURCE_FORMATS = [
  ...LOAD_SOURCE_FORMATS,
  'stored_invalid',
  'stored_unsupported',
  'unknown',
] as const;
const RECOVERY_SOURCE_FORMATS = [
  'legacy_raw',
  'legacy_compressed',
  'stored_invalid',
  'stored_unsupported',
  'unsaved',
] as const;

export const WHITEBOARD_ANALYTICS_CATALOG = {
  whiteboard_load_requested: {
    outcome: 'requested',
    trigger: 'macro begins one storage load attempt',
    properties: { schema_target: ['15.5'] },
  },
  whiteboard_load_succeeded: {
    outcome: 'succeeded',
    trigger: 'validated document or empty factory becomes ready',
    properties: {
      source_format: LOAD_SOURCE_FORMATS,
      duration_bucket: DURATION_BUCKETS,
      size_bucket: SIZE_BUCKETS,
    },
  },
  whiteboard_load_failed: {
    outcome: 'failed',
    trigger: 'storage, bridge, decode, validation, or mount fails',
    properties: {
      phase: PHASES,
      error_code: ERROR_CODES,
      source_format: FAILURE_SOURCE_FORMATS,
    },
  },
  whiteboard_save_requested: {
    outcome: 'requested',
    trigger: 'explicit edit or completed resize enters the save queue',
    properties: {
      change_source: ['editor', 'resize', 'retry', 'resume'],
      target_schema: ['15.5'],
      size_bucket: SIZE_BUCKETS,
    },
  },
  whiteboard_save_succeeded: {
    outcome: 'succeeded',
    trigger: 'queued revision is confirmed stored',
    properties: {
      change_source: ['editor', 'resize', 'retry', 'resume'],
      duration_bucket: DURATION_BUCKETS,
      size_bucket: SIZE_BUCKETS,
      coalesced_bucket: ['0', '1', '2_5', 'gte_6'],
    },
  },
  whiteboard_save_failed: {
    outcome: 'failed',
    trigger: 'validation, bridge, journal, or KVS save rejects',
    properties: {
      phase: PHASES,
      error_code: ERROR_CODES,
      retryable: [true, false],
    },
  },
  whiteboard_save_reconciliation_requested: {
    outcome: 'requested',
    trigger: 'user resumes an interrupted journaled save',
    properties: { phase: PHASES },
  },
  whiteboard_save_reconciliation_succeeded: {
    outcome: 'succeeded',
    trigger: 'same write is verified and finalized',
    properties: {
      phase: PHASES,
      duration_bucket: DURATION_BUCKETS,
    },
  },
  whiteboard_save_reconciliation_failed: {
    outcome: 'failed',
    trigger: 'interrupted save cannot reconcile safely',
    properties: {
      phase: PHASES,
      error_code: ERROR_CODES,
      retryable: [true, false],
    },
  },
  whiteboard_render_failed: {
    outcome: 'failed',
    trigger: 'editor error boundary catches rendering',
    properties: { error_code: ['editor_render_failed'] },
  },
  whiteboard_resize_succeeded: {
    outcome: 'succeeded',
    trigger: 'completed resize snapshot is confirmed stored',
    properties: { size_bucket: SIZE_BUCKETS },
  },
  whiteboard_resize_failed: {
    outcome: 'failed',
    trigger: 'completed resize snapshot fails to persist',
    properties: {
      size_bucket: SIZE_BUCKETS,
      error_code: ERROR_CODES,
    },
  },
  whiteboard_recovery_download_requested: {
    outcome: 'requested',
    trigger: 'user requests a local recovery file',
    properties: {
      source_format: RECOVERY_SOURCE_FORMATS,
      reason_code: ERROR_CODES,
    },
  },
  whiteboard_recovery_download_succeeded: {
    outcome: 'succeeded',
    trigger: 'browser creates the local recovery Blob',
    properties: {
      source_format: RECOVERY_SOURCE_FORMATS,
      size_bucket: SIZE_BUCKETS,
    },
  },
  whiteboard_recovery_download_failed: {
    outcome: 'failed',
    trigger: 'recovery read or Blob creation fails',
    properties: {
      phase: PHASES,
      error_code: ['kvs_read_failed', 'bridge_invoke_failed', 'recovery_download_failed'],
    },
  },
} as const;

export type WhiteboardAnalyticsEventName = keyof typeof WHITEBOARD_ANALYTICS_CATALOG;
