import mixpanel from 'mixpanel-browser';
import { WHITEBOARD_BUILD_METADATA } from '../../buildMetadata';
import { createWhiteboardAnalytics } from './trackWhiteboardEvent';

export const whiteboardAnalytics = createWhiteboardAnalytics({
  buildMetadata: WHITEBOARD_BUILD_METADATA,
  token: import.meta.env.VITE_MIXPANEL_TOKEN,
  transport: {
    init: (token, options) => mixpanel.init(token, options),
    track: (event, properties) => mixpanel.track(event, properties),
  },
});
