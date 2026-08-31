import LZUTF8 from 'lzutf8';

import type { DecodeLegacyValueOptions, LegacyDecodeResult } from './types.js';
import { fingerprintLegacyDocument } from './semanticFingerprint.js';
import { validateLegacyDocument } from './validateLegacyDocument.js';

const MAX_STORED_VALUE_BYTES = 240 * 1024;
const MAX_DECODED_JSON_BYTES = 8 * 1024 * 1024;
const utf8Encoder = new TextEncoder();

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(object: object, property: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function isStrictBase64(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length % 4 === 0
    && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}

function cloneJsonValue<Value>(value: Value): Value {
  if (Array.isArray(value)) {
    return value.map((item) => cloneJsonValue(item)) as Value;
  }
  if (value !== null && typeof value === 'object') {
    const clone: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      Object.defineProperty(clone, key, {
        configurable: true,
        enumerable: true,
        value: cloneJsonValue(item),
        writable: true,
      });
    }
    return clone as Value;
  }
  return value;
}

function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) {
      deepFreeze(item);
    }
    Object.freeze(value);
  }
  return value;
}

export function encodeLegacyDocument(value: unknown) {
  const validation = validateLegacyDocument(value);
  if (validation.kind !== 'valid') return validation;
  const compressedJson = LZUTF8.compress(JSON.stringify(validation.value), {
    outputEncoding: 'Base64',
  });
  if (typeof compressedJson !== 'string') {
    throw new TypeError('Legacy codec returned an unexpected encoding type');
  }
  const envelope = { compressedJson };
  if (utf8Encoder.encode(JSON.stringify(envelope)).byteLength > MAX_STORED_VALUE_BYTES) {
    return { kind: 'unsupported' as const, errorCode: 'payload_too_large' as const };
  }
  return {
    kind: 'encoded' as const,
    envelope,
  };
}

export async function decodeLegacyValue(
  value: unknown,
  _options: DecodeLegacyValueOptions,
): Promise<LegacyDecodeResult> {
  if (value === undefined) {
    return { kind: 'missing' };
  }
  if (Array.isArray(value)) {
    return {
      kind: 'unsupported',
      errorCode: 'legacy_array_unsupported',
    };
  }
  if (!isPlainRecord(value)) {
    return {
      kind: 'invalid',
      errorCode: 'document_schema_invalid',
    };
  }
  if (hasOwn(value, 'compressedJson') && Object.keys(value).length !== 1) {
    return {
      kind: 'unsupported',
      errorCode: 'compressed_envelope_unsupported',
    };
  }
  if (hasOwn(value, 'compressedJson') && !isStrictBase64(value.compressedJson)) {
    return {
      kind: 'invalid',
      errorCode: 'compressed_base64_invalid',
    };
  }
  if (hasOwn(value, 'compressedJson')
    && utf8Encoder.encode(JSON.stringify(value)).byteLength > MAX_STORED_VALUE_BYTES) {
    return { kind: 'unsupported', errorCode: 'payload_too_large' };
  }
  if (!hasOwn(value, 'compressedJson')) {
    const validation = validateLegacyDocument(value);
    if (validation.kind !== 'valid') return validation;
    const document = deepFreeze(cloneJsonValue(validation.value));
    return {
      kind: 'legacy-raw',
      document,
      fingerprints: await fingerprintLegacyDocument(document, _options.sha256Hex),
    };
  }
  let decompressedJson: string;
  try {
    const decompressed = LZUTF8.decompress(value.compressedJson as string, {
      inputEncoding: 'Base64',
      outputEncoding: 'String',
    });
    if (typeof decompressed !== 'string') {
      return { kind: 'invalid', errorCode: 'compressed_json_invalid' };
    }
    decompressedJson = decompressed;
  } catch {
    return { kind: 'invalid', errorCode: 'compressed_base64_invalid' };
  }
  let decoded: unknown;
  const requestedDecodedLimit = _options.maxDecodedJsonBytes;
  const decodedLimit = typeof requestedDecodedLimit === 'number'
    && Number.isFinite(requestedDecodedLimit)
    && requestedDecodedLimit >= 0
    ? Math.min(MAX_DECODED_JSON_BYTES, Math.floor(requestedDecodedLimit))
    : MAX_DECODED_JSON_BYTES;
  if (utf8Encoder.encode(decompressedJson).byteLength > decodedLimit) {
    return { kind: 'unsupported', errorCode: 'document_too_complex' };
  }
  try {
    decoded = JSON.parse(decompressedJson);
  } catch {
    return { kind: 'invalid', errorCode: 'compressed_json_invalid' };
  }
  const validation = validateLegacyDocument(decoded);
  if (validation.kind !== 'valid') return validation;
  const document = deepFreeze(cloneJsonValue(validation.value));
  return {
    kind: 'legacy-compressed',
    document,
    fingerprints: await fingerprintLegacyDocument(document, _options.sha256Hex),
  };
}
