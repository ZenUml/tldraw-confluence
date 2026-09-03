import type { WhiteboardBuildMetadata } from './utils/analytics/types';

const environment = import.meta.env.VITE_ENVIRONMENT_TYPE;
const commit = import.meta.env.VITE_APP_COMMIT;
const version = import.meta.env.VITE_APP_VERSION;

if (!['local', 'ci', 'development', 'staging', 'production'].includes(environment)) {
  throw new Error('Invalid Whiteboard build environment');
}
if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('Invalid Whiteboard build commit');
if (!version) throw new Error('Invalid Whiteboard build version');

export const WHITEBOARD_BUILD_METADATA: WhiteboardBuildMetadata = Object.freeze({
  app_version: version,
  app_commit: commit,
  sdk_version: '1.26.2',
  environment_type: environment as WhiteboardBuildMetadata['environment_type'],
});
