const ALLOWED_FIELDS = Object.freeze([
  'event_code',
  'phase',
  'outcome',
  'app_version',
  'app_commit',
  'environment_type',
  'error_code',
]);

const ALLOWED_FIELD_SET = new Set(ALLOWED_FIELDS);
const ENVIRONMENT_TYPES = new Set([
  'local',
  'ci',
  'development',
  'staging',
  'production',
]);
const OUTCOMES = new Set(['requested', 'succeeded', 'failed']);
const EVENT_CODES = new Set([
  'legacy_resolver_used',
  'whiteboard_load_requested',
  'whiteboard_load_succeeded',
  'whiteboard_load_failed',
  'whiteboard_save_requested',
  'whiteboard_save_succeeded',
  'whiteboard_save_failed',
  'whiteboard_save_reconciliation_requested',
  'whiteboard_save_reconciliation_succeeded',
  'whiteboard_save_reconciliation_failed',
  'whiteboard_render_failed',
  'whiteboard_resize_succeeded',
  'whiteboard_resize_failed',
  'whiteboard_recovery_download_requested',
  'whiteboard_recovery_download_succeeded',
  'whiteboard_recovery_download_failed',
]);
const ERROR_CODES = new Set([
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
]);

function isFinitePrimitive(value) {
  return typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value));
}

function isUrlLike(value) {
  return typeof value === 'string'
    && /^(?:[a-z][a-z\d+.-]*:|\/\/|www\.)/i.test(value.trim());
}

function hasOnlyDataProperties(event) {
  return Object.keys(event).every((field) => {
    const descriptor = Object.getOwnPropertyDescriptor(event, field);
    return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value');
  });
}

function validFieldValue(field, value) {
  if (!isFinitePrimitive(value) || isUrlLike(value)) return false;
  if (field === 'event_code') return EVENT_CODES.has(value);
  if (field === 'outcome') return OUTCOMES.has(value);
  if (field === 'environment_type') return ENVIRONMENT_TYPES.has(value);
  if (field === 'app_commit') return /^[0-9a-f]{40}$/.test(value);
  if (field === 'error_code') return ERROR_CODES.has(value);
  return true;
}

/**
 * Return a new, content-free log record or null. The function deliberately
 * does not serialize, inspect, or otherwise retain rejected values.
 */
export function sanitizeSafeLogEvent(event) {
  if (event === null || typeof event !== 'object' || Array.isArray(event)) {
    return null;
  }
  const fields = Object.keys(event);
  if (!fields.includes('event_code')
    || fields.some((field) => !ALLOWED_FIELD_SET.has(field))
    || !hasOnlyDataProperties(event)) {
    return null;
  }

  const sanitized = {};
  for (const field of fields) {
    const value = event[field];
    if (!validFieldValue(field, value)) return null;
    sanitized[field] = value;
  }
  return sanitized;
}

function writerFrom(options) {
  if (typeof options === 'function') return options;
  if (options && typeof options.writer === 'function') return options.writer;
  if (options && typeof options.write === 'function') return options.write;
  return null;
}

export function createSafeLogger(options = {}) {
  const writer = writerFrom(options);

  const log = (event) => {
    const sanitized = sanitizeSafeLogEvent(event);
    if (!sanitized) return { kind: 'dropped', reason: 'unsafe_event' };
    if (!writer) return { kind: 'dropped', reason: 'logger_disabled' };
    try {
      writer(sanitized);
      return { kind: 'written' };
    } catch {
      return { kind: 'dropped', reason: 'writer_failed' };
    }
  };

  return { log, write: log };
}

export { ALLOWED_FIELDS as SAFE_LOG_FIELDS };
