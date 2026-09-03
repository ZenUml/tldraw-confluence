import { WHITEBOARD_ANALYTICS_CATALOG } from './catalog';
import { UNKNOWN_CLIENT_DOMAIN } from './clientDomain';
import type {
  WhiteboardAnalyticsTransport,
  WhiteboardBuildMetadata,
  WhiteboardEventProperties,
  WhiteboardMixpanelInitOptions,
} from './types';

type CreateWhiteboardAnalyticsOptions = {
  buildMetadata: WhiteboardBuildMetadata;
  getClientDomain?: () => string | undefined;
  token?: string;
  transport?: WhiteboardAnalyticsTransport;
};

export const WHITEBOARD_MIXPANEL_INIT_OPTIONS: WhiteboardMixpanelInitOptions = {
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
};

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value));
}

function hasOwn(object: object, property: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function isValidBuildMetadata(buildMetadata: WhiteboardBuildMetadata): boolean {
  return typeof buildMetadata.app_version === 'string'
    && buildMetadata.app_version.trim().length > 0
    && /^[0-9a-f]{40}$/.test(buildMetadata.app_commit)
    && buildMetadata.sdk_version === '1.26.2'
    && [
      'local',
      'ci',
      'development',
      'staging',
      'production',
    ].includes(buildMetadata.environment_type);
}

export function createWhiteboardAnalytics({
  buildMetadata,
  getClientDomain,
  token,
  transport,
}: CreateWhiteboardAnalyticsOptions) {
  let transportReady = !transport;
  if (token && transport) {
    try {
      transport.init(token, WHITEBOARD_MIXPANEL_INIT_OPTIONS);
      transportReady = true;
    } catch {
      transportReady = false;
    }
  }
  const sender = transport?.track;

  return {
    track<EventName extends keyof WhiteboardEventProperties>(
      eventName: EventName,
      properties: WhiteboardEventProperties[EventName],
    ): { kind: 'sent' } | {
      kind: 'dropped';
      reason: 'analytics_disabled'
        | 'invalid_build_metadata'
        | 'invalid_event'
        | 'invalid_properties'
        | 'transport_failed';
    } {
      if (!isValidBuildMetadata(buildMetadata)) {
        return { kind: 'dropped', reason: 'invalid_build_metadata' };
      }
      if (transport && !token) {
        return { kind: 'dropped', reason: 'analytics_disabled' };
      }
      if (!transportReady) {
        return { kind: 'dropped', reason: 'transport_failed' };
      }
      if (!hasOwn(WHITEBOARD_ANALYTICS_CATALOG, eventName)) {
        return { kind: 'dropped', reason: 'invalid_event' };
      }
      const event = WHITEBOARD_ANALYTICS_CATALOG[eventName];
      const propertyContract = event.properties as Record<
        string,
        readonly (string | number | boolean)[]
      >;
      if (!properties
        || typeof properties !== 'object'
        || Array.isArray(properties)
        || Object.keys(properties).length !== Object.keys(propertyContract).length
        || Object.entries(properties).some(
        ([property, value]) => {
          if (!hasOwn(propertyContract, property) || !isScalar(value)) {
            return true;
          }
          return !propertyContract[property].includes(value);
        },
      )) {
        return { kind: 'dropped', reason: 'invalid_properties' };
      }
      try {
        sender?.(eventName, {
          feature_area: 'whiteboard',
          surface: 'confluence_macro',
          macro_type: 'whiteboard',
          client_domain: getClientDomain?.() || UNKNOWN_CLIENT_DOMAIN,
          ...buildMetadata,
          distinct_id: 'whiteboard-anonymous',
          outcome: event.outcome,
          ...properties,
        });
      } catch {
        return { kind: 'dropped', reason: 'transport_failed' };
      }
      return { kind: 'sent' };
    },
  };
}
