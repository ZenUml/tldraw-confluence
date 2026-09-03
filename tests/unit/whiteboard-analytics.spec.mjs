import { describe, expect, it } from 'vitest';

import { WHITEBOARD_ANALYTICS_CATALOG } from '../../static/spa/src/utils/analytics/catalog.ts';
import { createWhiteboardAnalytics } from '../../static/spa/src/utils/analytics/trackWhiteboardEvent.ts';

const VALID_BUILD_METADATA = {
  app_version: 'unreleased',
  app_commit: '0123456789abcdef0123456789abcdef01234567',
  sdk_version: '1.26.2',
  environment_type: 'ci',
};

function createTestAnalytics(sent, buildMetadata = VALID_BUILD_METADATA) {
  return createWhiteboardAnalytics({
    buildMetadata,
    token: 'public-project-token',
    transport: {
      init: () => {},
      track: (eventName, properties) => sent.push({ eventName, properties }),
    },
  });
}

describe('Whiteboard analytics contract', () => {
  it('publishes the approved lifecycle event catalog', () => {
    expect(Object.keys(WHITEBOARD_ANALYTICS_CATALOG)).toEqual([
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
  });

  it('freezes each event outcome, trigger, and property vocabulary', () => {
    const contract = Object.fromEntries(Object.entries(WHITEBOARD_ANALYTICS_CATALOG).map(
      ([eventName, definition]) => [eventName, {
        outcome: definition.outcome,
        properties: Object.keys(definition.properties),
        trigger: definition.trigger,
      }],
    ));

    expect(contract).toEqual({
      whiteboard_load_requested: {
        outcome: 'requested',
        properties: ['schema_target'],
        trigger: 'macro begins one storage load attempt',
      },
      whiteboard_load_succeeded: {
        outcome: 'succeeded',
        properties: ['source_format', 'duration_bucket', 'size_bucket'],
        trigger: 'validated document or empty factory becomes ready',
      },
      whiteboard_load_failed: {
        outcome: 'failed',
        properties: ['phase', 'error_code', 'source_format'],
        trigger: 'storage, bridge, decode, validation, or mount fails',
      },
      whiteboard_save_requested: {
        outcome: 'requested',
        properties: ['change_source', 'target_schema', 'size_bucket'],
        trigger: 'explicit edit or completed resize enters the save queue',
      },
      whiteboard_save_succeeded: {
        outcome: 'succeeded',
        properties: ['change_source', 'duration_bucket', 'size_bucket', 'coalesced_bucket'],
        trigger: 'queued revision is confirmed stored',
      },
      whiteboard_save_failed: {
        outcome: 'failed',
        properties: ['phase', 'error_code', 'retryable'],
        trigger: 'validation, bridge, journal, or KVS save rejects',
      },
      whiteboard_save_reconciliation_requested: {
        outcome: 'requested',
        properties: ['phase'],
        trigger: 'user resumes an interrupted journaled save',
      },
      whiteboard_save_reconciliation_succeeded: {
        outcome: 'succeeded',
        properties: ['phase', 'duration_bucket'],
        trigger: 'same write is verified and finalized',
      },
      whiteboard_save_reconciliation_failed: {
        outcome: 'failed',
        properties: ['phase', 'error_code', 'retryable'],
        trigger: 'interrupted save cannot reconcile safely',
      },
      whiteboard_render_failed: {
        outcome: 'failed',
        properties: ['error_code'],
        trigger: 'editor error boundary catches rendering',
      },
      whiteboard_resize_succeeded: {
        outcome: 'succeeded',
        properties: ['size_bucket'],
        trigger: 'completed resize snapshot is confirmed stored',
      },
      whiteboard_resize_failed: {
        outcome: 'failed',
        properties: ['size_bucket', 'error_code'],
        trigger: 'completed resize snapshot fails to persist',
      },
      whiteboard_recovery_download_requested: {
        outcome: 'requested',
        properties: ['source_format', 'reason_code'],
        trigger: 'user requests a local recovery file',
      },
      whiteboard_recovery_download_succeeded: {
        outcome: 'succeeded',
        properties: ['source_format', 'size_bucket'],
        trigger: 'browser creates the local recovery Blob',
      },
      whiteboard_recovery_download_failed: {
        outcome: 'failed',
        properties: ['phase', 'error_code'],
        trigger: 'recovery read or Blob creation fails',
      },
    });
  });

  it('sends an approved event with fixed Whiteboard and build properties', () => {
    const sent = [];
    const analytics = createTestAnalytics(sent);

    expect(analytics.track('whiteboard_load_requested', { schema_target: '15.5' })).toEqual({
      kind: 'sent',
    });
    expect(sent).toEqual([{
      eventName: 'whiteboard_load_requested',
      properties: {
        feature_area: 'whiteboard',
        surface: 'confluence_macro',
        macro_type: 'whiteboard',
        app_version: 'unreleased',
        app_commit: '0123456789abcdef0123456789abcdef01234567',
        sdk_version: '1.26.2',
        environment_type: 'ci',
        distinct_id: 'whiteboard-anonymous',
        outcome: 'requested',
        schema_target: '15.5',
      },
    }]);
  });

  it('drops an event instead of sending an unknown property', () => {
    const sent = [];
    const analytics = createTestAnalytics(sent);

    expect(analytics.track('whiteboard_load_requested', {
      schema_target: '15.5',
      localId: 'must-not-leave-the-iframe',
    })).toEqual({ kind: 'dropped', reason: 'invalid_properties' });
    expect(sent).toEqual([]);
  });

  it('drops an unknown event name without throwing', () => {
    const sent = [];
    const analytics = createTestAnalytics(sent);

    expect(analytics.track('whiteboard_document_dumped', {})).toEqual({
      kind: 'dropped',
      reason: 'invalid_event',
    });
    expect(sent).toEqual([]);
  });

  it('drops an event instead of sending a nested property value', () => {
    const sent = [];
    const analytics = createTestAnalytics(sent);

    expect(analytics.track('whiteboard_load_requested', {
      schema_target: { version: '15.5' },
    })).toEqual({ kind: 'dropped', reason: 'invalid_properties' });
    expect(sent).toEqual([]);
  });

  it('drops a non-object property payload without throwing', () => {
    const sent = [];
    const analytics = createTestAnalytics(sent);

    expect(() => analytics.track('whiteboard_load_requested', null)).not.toThrow();
    expect(analytics.track('whiteboard_load_requested', null)).toEqual({
      kind: 'dropped',
      reason: 'invalid_properties',
    });
    expect(sent).toEqual([]);
  });

  it('drops an event instead of sending a non-finite number', () => {
    const sent = [];
    const analytics = createTestAnalytics(sent);

    expect(analytics.track('whiteboard_load_requested', {
      schema_target: Number.NaN,
    })).toEqual({ kind: 'dropped', reason: 'invalid_properties' });
    expect(sent).toEqual([]);
  });

  it('drops an event whose allowlisted property has an unknown value', () => {
    const sent = [];
    const analytics = createTestAnalytics(sent);

    expect(analytics.track('whiteboard_load_requested', {
      schema_target: '16',
    })).toEqual({ kind: 'dropped', reason: 'invalid_properties' });
    expect(sent).toEqual([]);
  });

  it('drops an event when a required property is absent at runtime', () => {
    const sent = [];
    const analytics = createTestAnalytics(sent);

    expect(analytics.track('whiteboard_load_requested', {})).toEqual({
      kind: 'dropped',
      reason: 'invalid_properties',
    });
    expect(sent).toEqual([]);
  });

  it('sends an allowlisted boolean and enum for a failure event', () => {
    const sent = [];
    const analytics = createTestAnalytics(sent);

    expect(analytics.track('whiteboard_save_failed', {
      phase: 'kvs_write',
      error_code: 'kvs_write_failed',
      retryable: true,
    })).toEqual({ kind: 'sent' });
    expect(sent[0]).toMatchObject({
      eventName: 'whiteboard_save_failed',
      properties: {
        outcome: 'failed',
        phase: 'kvs_write',
        error_code: 'kvs_write_failed',
        retryable: true,
      },
    });
  });

  it('initializes the transport with privacy-safe Mixpanel options', () => {
    const initialized = [];

    createWhiteboardAnalytics({
      buildMetadata: {
        app_version: 'unreleased',
        app_commit: '0123456789abcdef0123456789abcdef01234567',
        sdk_version: '1.26.2',
        environment_type: 'ci',
      },
      token: 'public-project-token',
      transport: {
        init: (token, options) => initialized.push({ token, options }),
        track: () => {},
      },
    });

    expect(initialized).toEqual([{
      token: 'public-project-token',
      options: {
        track_pageview: false,
        autocapture: false,
        track_marketing: false,
        store_google: false,
        save_referrer: false,
        disable_persistence: true,
        ip: false,
        debug: false,
        property_blacklist: [
          '$current_url',
          '$referrer',
          '$referring_domain',
          '$initial_referrer',
          '$initial_referring_domain',
          '$search_engine',
          '$device_id',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_content',
          'utm_term',
          'utm_id',
          'utm_source_platform',
          'utm_creative_format',
          'utm_marketing_tactic',
          'gclid',
          'dclid',
          'fbclid',
          'msclkid',
          'ttclid',
          'twclid',
        ],
      },
    }]);
  });

  it('disables analytics when the public project token is absent', () => {
    const initialized = [];
    const sent = [];
    const analytics = createWhiteboardAnalytics({
      buildMetadata: {
        app_version: 'unreleased',
        app_commit: '0123456789abcdef0123456789abcdef01234567',
        sdk_version: '1.26.2',
        environment_type: 'ci',
      },
      transport: {
        init: (token, options) => initialized.push({ token, options }),
        track: (eventName, properties) => sent.push({ eventName, properties }),
      },
    });

    expect(analytics.track('whiteboard_load_requested', { schema_target: '15.5' })).toEqual({
      kind: 'dropped',
      reason: 'analytics_disabled',
    });
    expect(initialized).toEqual([]);
    expect(sent).toEqual([]);
  });

  it('does not let transport initialization failures block the macro', () => {
    expect(() => createWhiteboardAnalytics({
      buildMetadata: {
        app_version: 'unreleased',
        app_commit: '0123456789abcdef0123456789abcdef01234567',
        sdk_version: '1.26.2',
        environment_type: 'ci',
      },
      token: 'public-project-token',
      transport: {
        init: () => { throw new Error('synthetic init failure'); },
        track: () => {},
      },
    })).not.toThrow();
  });

  it('drops transport send failures without exposing their message', () => {
    const analytics = createWhiteboardAnalytics({
      buildMetadata: {
        app_version: 'unreleased',
        app_commit: '0123456789abcdef0123456789abcdef01234567',
        sdk_version: '1.26.2',
        environment_type: 'ci',
      },
      token: 'public-project-token',
      transport: {
        init: () => {},
        track: () => { throw new Error('sensitive transport detail'); },
      },
    });

    expect(analytics.track('whiteboard_load_requested', { schema_target: '15.5' })).toEqual({
      kind: 'dropped',
      reason: 'transport_failed',
    });
  });

  it.each([
    ['empty app version', { app_version: '' }],
    ['non-SHA commit', { app_commit: 'not-a-commit' }],
    ['unexpected SDK', { sdk_version: '2.0.0' }],
    ['unexpected environment', { environment_type: 'preview' }],
  ])('disables analytics for invalid build metadata: %s', (_label, override) => {
    const sent = [];
    const analytics = createTestAnalytics(sent, {
      ...VALID_BUILD_METADATA,
      ...override,
    });

    expect(analytics.track('whiteboard_load_requested', { schema_target: '15.5' })).toEqual({
      kind: 'dropped',
      reason: 'invalid_build_metadata',
    });
    expect(sent).toEqual([]);
  });
});
