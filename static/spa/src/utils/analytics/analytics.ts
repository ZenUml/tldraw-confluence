import mixpanel from 'mixpanel-browser';
import { WHITEBOARD_BUILD_METADATA } from '../../buildMetadata';
import { clientDomainFromForgeContext } from './clientDomain';
import { createWhiteboardAnalytics } from './trackWhiteboardEvent';

let clientDomain: string | undefined;

export function setWhiteboardAnalyticsContext(context?: Parameters<typeof clientDomainFromForgeContext>[0]) {
  clientDomain = clientDomainFromForgeContext(context);
}

export const whiteboardAnalytics = createWhiteboardAnalytics({
  buildMetadata: WHITEBOARD_BUILD_METADATA,
  getClientDomain: () => clientDomain,
  token: import.meta.env.VITE_MIXPANEL_TOKEN,
  transport: {
    init: (token, options) => mixpanel.init(token, options),
    track: (event, properties) => mixpanel.track(event, properties),
  },
});
