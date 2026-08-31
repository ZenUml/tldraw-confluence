export type Sha256Hex = (canonicalUtf8: string) => Promise<string>;

export type DecodeLegacyValueOptions = {
  sha256Hex: Sha256Hex;
  /** May only tighten the fixed 8 MiB production ceiling. */
  maxDecodedJsonBytes?: number;
};

export type LegacyPage = {
  id: string;
  name?: string;
  childIndex?: number;
  shapes: Record<string, Record<string, unknown>>;
  bindings: Record<string, Record<string, unknown>>;
};

export type LegacyPageState = {
  id: string;
  selectedIds: string[];
  camera: { point: [number, number]; zoom: number };
  brush?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    rotation?: number;
  } | null;
  pointedId?: string | null;
  hoveredId?: string | null;
  editingId?: string | null;
  bindingId?: string | null;
};

export type LegacyDocument = {
  id: string;
  name: string;
  version: 15.5;
  pages: Record<string, LegacyPage>;
  pageStates: Record<string, LegacyPageState>;
  assets: Record<string, never>;
  viewport?: { height: number };
};

export type ValidationErrorCode =
  | 'assets_unsupported'
  | 'binding_unsupported'
  | 'document_feature_unsupported'
  | 'document_schema_invalid'
  | 'document_too_complex'
  | 'document_version_unsupported'
  | 'shape_type_unsupported'
  | 'viewport_height_invalid';

export type ValidationResult<Value> =
  | { kind: 'valid'; value: Value }
  | { kind: 'invalid'; errorCode: 'document_schema_invalid' }
  | { kind: 'unsupported'; errorCode: Exclude<ValidationErrorCode, 'document_schema_invalid'> };

export type LegacyDecodeResult =
  | { kind: 'missing' }
  | {
    kind: 'unsupported';
    errorCode:
      | 'assets_unsupported'
      | 'binding_unsupported'
      | 'compressed_envelope_unsupported'
      | 'document_feature_unsupported'
      | 'document_too_complex'
      | 'document_version_unsupported'
      | 'legacy_array_unsupported'
      | 'payload_too_large'
      | 'shape_type_unsupported'
      | 'viewport_height_invalid';
  }
  | {
    kind: 'invalid';
    errorCode:
      | 'compressed_base64_invalid'
      | 'compressed_json_invalid'
      | 'document_schema_invalid';
  }
  | {
    kind: 'legacy-raw';
    document: LegacyDocument;
    fingerprints: { codec: string; editor: string };
  }
  | {
    kind: 'legacy-compressed';
    document: LegacyDocument;
    fingerprints: { codec: string; editor: string };
  };
