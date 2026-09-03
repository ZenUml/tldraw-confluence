export const UNKNOWN_CLIENT_DOMAIN = 'unknown_atlassian_domain';

type ForgeAnalyticsContext = {
  siteUrl?: unknown;
  extension?: {
    location?: unknown;
  };
};

export function clientDomainFromForgeContext(context?: ForgeAnalyticsContext): string {
  const location = context?.siteUrl || context?.extension?.location;
  if (typeof location !== 'string') return UNKNOWN_CLIENT_DOMAIN;

  try {
    const origin = new URL(location).origin.toLowerCase();
    const match = /^https:\/\/([a-z0-9-_]+)\.atlassian\.net$/.exec(origin);
    return match?.[1] || UNKNOWN_CLIENT_DOMAIN;
  } catch {
    return UNKNOWN_CLIENT_DOMAIN;
  }
}
