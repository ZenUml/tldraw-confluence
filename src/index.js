import { createHash, randomUUID } from 'node:crypto';

import Resolver from '@forge/resolver';
import { createLegacyStorageHandlers } from './persistence/createLegacyStorageHandlers.mjs';
import { createWhiteboardStorage } from './persistence/createWhiteboardStorage.mjs';
import { createSafeLogger } from './observability/createSafeLogger.mjs';

const resolver = new Resolver();
const { documentStore, journalStore } = createWhiteboardStorage();
const storageHandlers = createLegacyStorageHandlers({
  documentStore,
  journalStore,
  sha256Hex: (value) => Promise.resolve(
    createHash('sha256').update(value, 'utf8').digest('hex'),
  ),
});
const safeLogger = createSafeLogger({ writer: (event) => console.info(event) });

resolver.define('load-document', ({ context }) => (
  storageHandlers.loadDocument({ context })
));

resolver.define('save-document', ({ context, payload }) => (
  storageHandlers.saveDocument({ context, payload })
));

resolver.define('resume-save', ({ context, payload }) => (
  storageHandlers.resumeSave({ context, payload })
));

resolver.define('download-recovery', ({ context }) => (
  storageHandlers.readRecovery({ context })
));

// One-release compatibility aliases for cached pre-WP2 iframe bundles.
resolver.define('get-all', async ({ context }) => {
  safeLogger.log({ event_code: 'legacy_resolver_used' });
  const result = await storageHandlers.loadDocument({ context });
  if (result.kind === 'missing') return undefined;
  if (result.kind === 'legacy-raw' || result.kind === 'legacy-compressed') {
    return result.document;
  }
  throw new Error(result.errorCode ?? 'kvs_read_failed');
});

resolver.define('update', async ({ context, payload }) => {
  safeLogger.log({ event_code: 'legacy_resolver_used' });
  const current = await storageHandlers.loadDocument({ context });
  if (current.kind !== 'legacy-raw' && current.kind !== 'legacy-compressed') {
    return { kind: 'invalid', errorCode: 'legacy_client_reload_required' };
  }
  return storageHandlers.saveDocument({
    context,
    payload: {
      envelope: payload,
      baseRevision: current.writeState.revision,
      expectedToken: current.writeState.token,
      writeId: randomUUID(),
    },
  });
});

export const handler = resolver.getDefinitions();
