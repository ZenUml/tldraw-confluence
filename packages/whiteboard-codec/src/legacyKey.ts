export type LegacyKeyResult =
  | { kind: 'valid'; key: string }
  | { kind: 'invalid'; errorCode: 'invalid_local_id' };

const FORGE_KVS_KEY = /^(?!\s+$)[a-zA-Z0-9:._\s#-]+$/;

export function deriveLegacyKey(context: unknown): LegacyKeyResult {
  if (context === null || typeof context !== 'object') {
    return { kind: 'invalid', errorCode: 'invalid_local_id' };
  }
  const localId = (context as { localId?: unknown }).localId;
  if (typeof localId !== 'string' || localId.length === 0 || localId.endsWith('/')) {
    return { kind: 'invalid', errorCode: 'invalid_local_id' };
  }
  const separator = localId.lastIndexOf('/');
  const key = localId.slice(separator + 1);
  if (key.length === 0 || key.length > 500 || !FORGE_KVS_KEY.test(key)) {
    return { kind: 'invalid', errorCode: 'invalid_local_id' };
  }
  return { kind: 'valid', key };
}
