import { createHash, webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import {
  canonicalizeLegacyDocument,
  createEmptyLegacyDocument,
  decodeLegacyValue,
  deriveLegacyKey,
  encodeLegacyDocument,
} from '@zenuml/whiteboard-codec';

const requireFromCodec = createRequire(new URL('../../packages/whiteboard-codec/package.json', import.meta.url));
const LZUTF8 = requireFromCodec('lzutf8');

function nodeSha256Hex(value) {
  return Promise.resolve(createHash('sha256').update(value, 'utf8').digest('hex'));
}

async function webSha256Hex(value) {
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function emptyDocument() {
  return {
    id: 'doc',
    name: 'New Document',
    version: 15.5,
    pages: {
      page: {
        id: 'page',
        name: 'Page 1',
        childIndex: 1,
        shapes: {},
        bindings: {},
      },
    },
    pageStates: {
      page: {
        id: 'page',
        selectedIds: [],
        camera: { point: [0, 0], zoom: 1 },
      },
    },
    assets: {},
  };
}

function rectangleShape(overrides = {}) {
  return {
    id: 'rectangle-1',
    type: 'rectangle',
    name: 'Rectangle',
    parentId: 'page',
    childIndex: 1.5,
    point: [10, 20],
    style: {
      color: 'blue',
      size: 'medium',
      dash: 'solid',
    },
    size: [120, 80],
    ...overrides,
  };
}

function shape(id, type, childIndex, subtype) {
  return {
    id,
    type,
    name: type,
    parentId: 'page',
    childIndex,
    point: [childIndex * 10, childIndex * 20],
    style: {
      color: 'black',
      size: 'small',
      dash: 'draw',
    },
    ...subtype,
  };
}

describe('Whiteboard legacy codec', () => {
  it('classifies an absent KVS value as missing', async () => {
    await expect(decodeLegacyValue(undefined, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({ kind: 'missing' });
  });

  it('classifies legacy array storage as unsupported without hashing it', async () => {
    let hashCalls = 0;

    await expect(decodeLegacyValue([], {
      sha256Hex: async () => { hashCalls += 1; return 'unused'; },
    })).resolves.toEqual({
      kind: 'unsupported',
      errorCode: 'legacy_array_unsupported',
    });
    expect(hashCalls).toBe(0);
  });

  it.each([null, true, 42, 'stored-text'])('classifies non-document value %j as invalid', async (value) => {
    await expect(decodeLegacyValue(value, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({
      kind: 'invalid',
      errorCode: 'document_schema_invalid',
    });
  });

  it('rejects an extended compressed envelope instead of treating it as raw', async () => {
    await expect(decodeLegacyValue({ compressedJson: 'QQ==', extra: true }, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({
      kind: 'unsupported',
      errorCode: 'compressed_envelope_unsupported',
    });
  });

  it.each(['', 'not base64!', 42])('rejects invalid compressed Base64 %j before decompression', async (compressedJson) => {
    await expect(decodeLegacyValue({ compressedJson }, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({
      kind: 'invalid',
      errorCode: 'compressed_base64_invalid',
    });
  });

  it('accepts an exact empty v15.5 raw document and computes both fingerprints', async () => {
    const document = emptyDocument();
    const canonicalInputs = [];
    const hashes = ['a'.repeat(64), 'b'.repeat(64)];

    await expect(decodeLegacyValue(document, {
      sha256Hex: async (canonicalUtf8) => {
        canonicalInputs.push(canonicalUtf8);
        return hashes[canonicalInputs.length - 1];
      },
    })).resolves.toEqual({
      kind: 'legacy-raw',
      document,
      fingerprints: {
        codec: 'a'.repeat(64),
        editor: 'b'.repeat(64),
      },
    });
    expect(canonicalInputs).toHaveLength(2);
    expect(canonicalInputs[0]).not.toEqual(canonicalInputs[1]);
  });

  it('returns an immutable structural clone instead of the mutable storage value', async () => {
    const stored = emptyDocument();
    const result = await decodeLegacyValue(stored, {
      sha256Hex: async () => 'a'.repeat(64),
    });

    stored.name = 'mutated after decode';
    expect(result.document.name).toBe('New Document');
    expect(Object.isFrozen(result.document)).toBe(true);
    expect(Object.isFrozen(result.document.pages.page)).toBe(true);
  });

  it('encodes a validated document into the exact legacy envelope', () => {
    const document = emptyDocument();
    const result = encodeLegacyDocument(document);

    expect(result.kind).toBe('encoded');
    expect(Object.keys(result.envelope)).toEqual(['compressedJson']);
    expect(result.envelope.compressedJson).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });

  it('decodes the exact compressed legacy envelope losslessly', async () => {
    const document = emptyDocument();
    const encoded = encodeLegacyDocument(document);

    await expect(decodeLegacyValue(encoded.envelope, {
      sha256Hex: async () => 'c'.repeat(64),
    })).resolves.toEqual({
      kind: 'legacy-compressed',
      document,
      fingerprints: {
        codec: 'c'.repeat(64),
        editor: 'c'.repeat(64),
      },
    });
  });

  it('derives the legacy key from the final localId segment byte-for-byte', () => {
    expect(deriveLegacyKey({
      localId: 'ari:cloud:ecosystem::extension/macro/same Case#1',
    })).toEqual({ kind: 'valid', key: 'same Case#1' });
  });

  it.each([
    undefined,
    {},
    { localId: 42 },
    { localId: '' },
    { localId: 'ari/macro/' },
    { localId: 'ari/macro/   ' },
    { localId: 'ari/macro/not@allowed' },
    { localId: `ari/macro/${'x'.repeat(501)}` },
  ])('rejects unsafe localId context %j without returning a key', (context) => {
    expect(deriveLegacyKey(context)).toEqual({
      kind: 'invalid',
      errorCode: 'invalid_local_id',
    });
  });

  it('validates brush bounds and keeps brush changes in the editor fingerprint', async () => {
    const document = emptyDocument();
    document.pageStates.page.brush = {
      minX: 1,
      minY: 2,
      maxX: 11,
      maxY: 22,
      width: 10,
      height: 20,
      rotation: 0,
    };
    const result = await decodeLegacyValue(document, {
      sha256Hex: async () => 'd'.repeat(64),
    });
    const withoutBrush = emptyDocument();

    expect(result.kind).toBe('legacy-raw');
    expect(canonicalizeLegacyDocument(result.document, 'editor')).not.toEqual(
      canonicalizeLegacyDocument(withoutBrush, 'editor'),
    );
  });

  it('accepts the exact producer rectangle surface with fractional childIndex', async () => {
    const document = emptyDocument();
    document.pages.page.shapes['rectangle-1'] = rectangleShape();

    const result = await decodeLegacyValue(document, {
      sha256Hex: async () => 'e'.repeat(64),
    });

    expect(result.kind).toBe('legacy-raw');
    expect(result.document.pages.page.shapes['rectangle-1'].childIndex).toBe(1.5);
  });

  it('accepts the seven asset-free non-group producer shape types', async () => {
    const document = emptyDocument();
    document.pages.page.shapes = {
      rectangle: shape('rectangle', 'rectangle', 1, { size: [100, 80] }),
      ellipse: shape('ellipse', 'ellipse', 2, { radius: [50, 40] }),
      triangle: shape('triangle', 'triangle', 3, { size: [90, 70] }),
      draw: shape('draw', 'draw', 4, {
        points: [[0, 0, 0.25], [10, 5, 1]],
        isComplete: true,
      }),
      arrow: shape('arrow', 'arrow', 5, {
        bend: 0,
        handles: {
          start: { id: 'start', index: 0, point: [0, 0], canBind: true },
          bend: { id: 'bend', index: 2, point: [50, 0] },
          end: { id: 'end', index: 1, point: [100, 0], canBind: true },
        },
        decorations: { end: 'arrow' },
      }),
      text: shape('text', 'text', 6, { text: 'Synthetic text' }),
      sticky: shape('sticky', 'sticky', 7, { size: [200, 200], text: 'Synthetic sticky' }),
    };

    const result = await decodeLegacyValue(document, {
      sha256Hex: async () => 'f'.repeat(64),
    });

    expect(result.kind).toBe('legacy-raw');
    expect(Object.keys(result.document.pages.page.shapes)).toHaveLength(7);
  });

  it('accepts a reciprocal one-level group with one child', async () => {
    const document = emptyDocument();
    document.pages.page.shapes = {
      group: shape('group', 'group', 1, {
        size: [300, 200],
        children: ['rectangle-child'],
      }),
      'rectangle-child': shape('rectangle-child', 'rectangle', 1.25, {
        parentId: 'group',
        size: [100, 80],
      }),
    };

    const result = await decodeLegacyValue(document, {
      sha256Hex: async () => '1'.repeat(64),
    });

    expect(result.kind).toBe('legacy-raw');
    expect(result.document.pages.page.shapes.group.children).toEqual(['rectangle-child']);
  });

  it('accepts one reciprocal arrow endpoint binding', async () => {
    const document = emptyDocument();
    document.pages.page.shapes = {
      rectangle: shape('rectangle', 'rectangle', 1, { size: [100, 80] }),
      arrow: shape('arrow', 'arrow', 2, {
        bend: 0,
        handles: {
          start: { id: 'start', index: 0, point: [0, 0], canBind: true },
          bend: { id: 'bend', index: 2, point: [50, 0] },
          end: {
            id: 'end',
            index: 1,
            point: [100, 0],
            canBind: true,
            bindingId: 'binding-1',
          },
        },
      }),
    };
    document.pages.page.bindings = {
      'binding-1': {
        id: 'binding-1',
        type: 'arrow',
        fromId: 'arrow',
        toId: 'rectangle',
        handleId: 'end',
        distance: 0,
        point: [0.5, 0.5],
      },
    };

    const result = await decodeLegacyValue(document, {
      sha256Hex: async () => '2'.repeat(64),
    });

    expect(result.kind).toBe('legacy-raw');
    expect(result.document.pages.page.bindings['binding-1'].toId).toBe('rectangle');
  });

  it('rejects page-state references that do not resolve on the same page', async () => {
    const document = emptyDocument();
    document.pages.page.shapes.rectangle = rectangleShape({ id: 'rectangle' });
    document.pageStates.page.selectedIds = ['missing-shape'];

    await expect(decodeLegacyValue(document, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({
      kind: 'invalid',
      errorCode: 'document_schema_invalid',
    });
  });

  it('creates a fresh canonical empty v15.5 document with no viewport', () => {
    const first = createEmptyLegacyDocument();
    const second = createEmptyLegacyDocument();

    expect(first).toEqual(emptyDocument());
    expect(first).not.toBe(second);
    expect(first.pages.page).not.toBe(second.pages.page);
    first.name = 'mutated instance';
    expect(second.name).toBe('New Document');
    expect(first).not.toHaveProperty('viewport');
  });

  it('canonicalizes schema fields independently from input object property order', async () => {
    const first = emptyDocument();
    first.pages.page.shapes.rectangle = rectangleShape({ id: 'rectangle' });
    const second = emptyDocument();
    second.pages.page.shapes.rectangle = {
      size: [120, 80],
      style: { dash: 'solid', size: 'medium', color: 'blue' },
      point: [10, 20],
      childIndex: 1.5,
      parentId: 'page',
      name: 'Rectangle',
      type: 'rectangle',
      id: 'rectangle',
    };
    const [firstResult, secondResult] = await Promise.all([
      decodeLegacyValue(first, { sha256Hex: async () => '3'.repeat(64) }),
      decodeLegacyValue(second, { sha256Hex: async () => '3'.repeat(64) }),
    ]);

    expect(canonicalizeLegacyDocument(firstResult.document, 'codec')).toEqual(
      canonicalizeLegacyDocument(secondResult.document, 'codec'),
    );
  });

  it.each([
    ['older version', (document) => { document.version = 15.4; }, 'document_version_unsupported'],
    ['unknown root field', (document) => { document.future = true; }, 'document_feature_unsupported'],
    ['non-empty assets', (document) => { document.assets.asset = { id: 'asset' }; }, 'assets_unsupported'],
    ['line pseudo-shape', (document) => {
      document.pages.page.shapes.line = shape('line', 'line', 1, {});
    }, 'shape_type_unsupported'],
  ])('fails closed for unsupported %s', async (_label, mutate, errorCode) => {
    const document = emptyDocument();
    mutate(document);

    await expect(decodeLegacyValue(document, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({ kind: 'unsupported', errorCode });
  });

  it('rejects dangerous own keys before cloning', async () => {
    const document = JSON.parse(JSON.stringify(emptyDocument()));
    Object.defineProperty(document, '__proto__', {
      enumerable: true,
      value: { polluted: true },
    });

    await expect(decodeLegacyValue(document, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({
      kind: 'invalid',
      errorCode: 'document_schema_invalid',
    });
    expect({}.polluted).toBeUndefined();
  });

  it('rejects a document whose total UTF-8 text exceeds 1 MiB', async () => {
    const document = emptyDocument();
    document.pages.page.shapes.text = shape('text', 'text', 1, {
      text: 'x'.repeat((1024 * 1024) + 1),
    });

    await expect(decodeLegacyValue(document, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({
      kind: 'unsupported',
      errorCode: 'document_too_complex',
    });
  });

  it('rejects a compressed legacy envelope over the 240 KiB KVS value limit', () => {
    let seed = 0x12345678;
    let text = '';
    for (let index = 0; index < 450_000; index += 1) {
      seed = ((seed * 1664525) + 1013904223) >>> 0;
      text += String.fromCharCode(32 + (seed % 95));
    }
    const document = emptyDocument();
    document.pages.page.shapes.text = shape('text', 'text', 1, { text });

    const result = encodeLegacyDocument(document);

    expect(result.kind).toBe('unsupported');
    if (result.kind === 'unsupported') {
      expect(result.errorCode).toBe('payload_too_large');
    }
  });

  it('rejects an own optional field whose undefined value would be lost by JSON', async () => {
    const document = emptyDocument();
    document.pages.page.shapes.rectangle = rectangleShape({
      id: 'rectangle',
      rotation: undefined,
    });

    await expect(decodeLegacyValue(document, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({
      kind: 'invalid',
      errorCode: 'document_schema_invalid',
    });
  });

  it('checks the decoded UTF-8 budget before parsing compressed JSON', async () => {
    const compressedJson = LZUTF8.compress(`"${'x'.repeat(2048)}"`, {
      outputEncoding: 'Base64',
    });

    await expect(decodeLegacyValue({ compressedJson }, {
      sha256Hex: async () => 'unused',
      maxDecodedJsonBytes: 1024,
    })).resolves.toEqual({
      kind: 'unsupported',
      errorCode: 'document_too_complex',
    });
  });

  it('classifies an unknown nested producer field as unsupported', async () => {
    const document = emptyDocument();
    document.pages.page.shapes.arrow = shape('arrow', 'arrow', 1, {
      bend: 0,
      handles: {
        start: { id: 'start', index: 0, point: [0, 0], future: true },
        bend: { id: 'bend', index: 2, point: [50, 0] },
        end: { id: 'end', index: 1, point: [100, 0] },
      },
    });

    await expect(decodeLegacyValue(document, {
      sha256Hex: async () => 'unused',
    })).resolves.toEqual({
      kind: 'unsupported',
      errorCode: 'document_feature_unsupported',
    });
  });

  it('produces the same lowercase SHA-256 golden vector in Node and Web Crypto', async () => {
    const expected = 'a3f8718994d795abea29f4569dbc24bf309dab6e244abcc0e09692103e96e0fd';

    await expect(nodeSha256Hex('zenuml-whiteboard-v1')).resolves.toBe(expected);
    await expect(webSha256Hex('zenuml-whiteboard-v1')).resolves.toBe(expected);
  });

  it('preserves the codec fingerprint across raw encode and compressed decode', async () => {
    const raw = emptyDocument();
    raw.pages.page.shapes.rectangle = rectangleShape({ id: 'rectangle' });
    const rawResult = await decodeLegacyValue(raw, { sha256Hex: nodeSha256Hex });
    const encoded = encodeLegacyDocument(rawResult.document);
    const compressedResult = await decodeLegacyValue(encoded.envelope, {
      sha256Hex: nodeSha256Hex,
    });

    expect(compressedResult.fingerprints.codec).toBe(rawResult.fingerprints.codec);
  });
});
