export { decodeLegacyValue, encodeLegacyDocument } from './legacyCodec.js';
export { createEmptyLegacyDocument } from './emptyLegacyDocument.js';
export { deriveLegacyKey } from './legacyKey.js';
export type { LegacyKeyResult } from './legacyKey.js';
export {
  canonicalizeLegacyDocument,
  fingerprintLegacyDocument,
} from './semanticFingerprint.js';
export { validateLegacyDocument } from './validateLegacyDocument.js';
export type {
  DecodeLegacyValueOptions,
  LegacyDocument,
  LegacyDecodeResult,
  LegacyPage,
  LegacyPageState,
  Sha256Hex,
  ValidationErrorCode,
  ValidationResult,
} from './types.js';
