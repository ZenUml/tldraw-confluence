import type {
  WHITEBOARD_ANALYTICS_CATALOG,
  WhiteboardAnalyticsEventName,
} from './catalog';

export type WhiteboardEnvironmentType =
  | 'local'
  | 'ci'
  | 'development'
  | 'staging'
  | 'production';

export type WhiteboardBuildMetadata = {
  app_version: string;
  app_commit: string;
  sdk_version: '1.26.2';
  environment_type: WhiteboardEnvironmentType;
};

type AnalyticsCatalog = typeof WHITEBOARD_ANALYTICS_CATALOG;
type AllowedPropertyValue<Value> = Value extends readonly (infer Item)[] ? Item : never;

export type WhiteboardEventProperties = {
  [EventName in WhiteboardAnalyticsEventName]: {
    [PropertyName in keyof AnalyticsCatalog[EventName]['properties']]:
      AllowedPropertyValue<AnalyticsCatalog[EventName]['properties'][PropertyName]>;
  };
};

export type WhiteboardAnalyticsSender = (
  eventName: WhiteboardAnalyticsEventName,
  properties: Record<string, string | number | boolean>,
) => void;

export type WhiteboardMixpanelInitOptions = {
  track_pageview: false;
  autocapture: false;
  track_marketing: false;
  store_google: false;
  save_referrer: false;
  disable_persistence: true;
  ip: false;
  debug: false;
  property_blacklist: readonly string[];
};

export type WhiteboardAnalyticsTransport = {
  init: (token: string, options: WhiteboardMixpanelInitOptions) => void;
  track: WhiteboardAnalyticsSender;
};
