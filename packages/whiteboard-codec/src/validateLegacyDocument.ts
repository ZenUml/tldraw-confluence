import type {
  LegacyDocument,
  LegacyPage,
  LegacyPageState,
  ValidationResult,
} from './types.js';

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_DECODED_JSON_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_BYTES = 1024 * 1024;
const MAX_DEPTH = 31;
const MAX_SHAPES = 10_000;
const MAX_BINDINGS = 20_000;
const MAX_DRAW_POINTS = 250_000;
const utf8Encoder = new TextEncoder();

function inspectComplexity(value: unknown) {
  const seen = new WeakSet<object>();
  let textBytes = 0;
  let tooDeep = false;
  let cyclic = false;
  let unsafeJsonValue = false;
  function visit(current: unknown, depth: number) {
    if (tooDeep || cyclic || unsafeJsonValue || textBytes > MAX_TEXT_BYTES) return;
    if (typeof current === 'string') {
      textBytes += utf8Encoder.encode(current).byteLength;
      return;
    }
    if (current === undefined
      || typeof current === 'bigint'
      || typeof current === 'function'
      || typeof current === 'symbol'
      || (typeof current === 'number' && !Number.isFinite(current))) {
      unsafeJsonValue = true;
      return;
    }
    if (current === null || typeof current !== 'object') return;
    if (depth > MAX_DEPTH) {
      tooDeep = true;
      return;
    }
    if (seen.has(current)) {
      cyclic = true;
      return;
    }
    seen.add(current);
    for (const item of Array.isArray(current) ? current : Object.values(current)) {
      visit(item, depth + 1);
    }
    seen.delete(current);
  }
  visit(value, 1);
  return {
    cyclic,
    tooComplex: tooDeep || textBytes > MAX_TEXT_BYTES,
    unsafeJsonValue,
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isFinitePair(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

function isPositiveFinitePair(value: unknown): value is [number, number] {
  return isFinitePair(value) && value.every((item) => item > 0);
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): 'exact' | 'invalid' | 'unsupported' {
  const keys = Object.keys(value);
  if (keys.some((key) => DANGEROUS_KEYS.has(key))) {
    return 'invalid';
  }
  if (required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) {
    return 'invalid';
  }
  const allowed = new Set([...required, ...optional]);
  return keys.some((key) => !allowed.has(key)) ? 'unsupported' : 'exact';
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && !DANGEROUS_KEYS.has(value);
}

function validateEmptyRecord(value: unknown): ValidationResult<Record<string, never>> {
  if (!isPlainRecord(value)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (Object.keys(value).some((key) => DANGEROUS_KEYS.has(key))) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (Object.keys(value).length > 0) {
    return { kind: 'unsupported', errorCode: 'document_feature_unsupported' };
  }
  return { kind: 'valid', value: value as Record<string, never> };
}

function validateStyle(value: unknown): ValidationResult<Record<string, unknown>> {
  if (!isPlainRecord(value)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  const keys = hasExactKeys(
    value,
    ['color', 'size', 'dash'],
    ['font', 'textAlign', 'isFilled', 'scale'],
  );
  if (keys !== 'exact') {
    return keys === 'unsupported'
      ? { kind: 'unsupported', errorCode: 'document_feature_unsupported' }
      : { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  const colors = [
    'white', 'lightGray', 'gray', 'black', 'green', 'cyan',
    'blue', 'indigo', 'violet', 'red', 'orange', 'yellow',
  ];
  if (!colors.includes(value.color as string)
    || !['small', 'medium', 'large'].includes(value.size as string)
    || !['draw', 'solid', 'dashed', 'dotted'].includes(value.dash as string)
    || (value.font !== undefined
      && !['script', 'sans', 'serif', 'mono'].includes(value.font as string))
    || (value.textAlign !== undefined
      && !['start', 'middle', 'end', 'justify'].includes(value.textAlign as string))
    || (value.isFilled !== undefined && typeof value.isFilled !== 'boolean')
    || (value.scale !== undefined
      && (typeof value.scale !== 'number' || !Number.isFinite(value.scale) || value.scale <= 0))) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  return { kind: 'valid', value };
}

const COMMON_SHAPE_REQUIRED = [
  'id', 'type', 'name', 'parentId', 'childIndex', 'point', 'style',
] as const;
const COMMON_SHAPE_OPTIONAL = [
  'rotation', 'isGhost', 'isHidden', 'isLocked', 'isGenerated', 'isAspectRatioLocked',
] as const;

function validateShape(
  value: unknown,
  mapKey: string,
  pageId: string,
): ValidationResult<Record<string, unknown>> {
  if (!isPlainRecord(value)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (Object.prototype.hasOwnProperty.call(value, 'assetId')) {
    return { kind: 'unsupported', errorCode: 'assets_unsupported' };
  }
  const type = value.type;
  if (!['rectangle', 'ellipse', 'triangle', 'draw', 'arrow', 'text', 'sticky', 'group'].includes(type as string)) {
    return { kind: 'unsupported', errorCode: 'shape_type_unsupported' };
  }
  let subtypeRequired: string[];
  let subtypeOptional: string[] = [];
  switch (type) {
    case 'rectangle':
    case 'triangle':
      subtypeRequired = ['size'];
      subtypeOptional = ['label', 'labelPoint'];
      break;
    case 'ellipse':
      subtypeRequired = ['radius'];
      subtypeOptional = ['label', 'labelPoint'];
      break;
    case 'draw':
      subtypeRequired = ['points', 'isComplete'];
      break;
    case 'arrow':
      subtypeRequired = ['bend', 'handles'];
      subtypeOptional = ['decorations', 'label', 'labelPoint'];
      break;
    case 'text':
      subtypeRequired = ['text'];
      break;
    case 'sticky':
      subtypeRequired = ['size', 'text'];
      break;
    case 'group':
      subtypeRequired = ['size', 'children'];
      break;
    default:
      return { kind: 'unsupported', errorCode: 'shape_type_unsupported' };
  }
  const keys = hasExactKeys(
    value,
    [...COMMON_SHAPE_REQUIRED, ...subtypeRequired],
    [...COMMON_SHAPE_OPTIONAL, ...subtypeOptional],
  );
  if (keys !== 'exact') {
    return keys === 'unsupported'
      ? { kind: 'unsupported', errorCode: 'document_feature_unsupported' }
      : { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (!isSafeId(value.id)
    || value.id !== mapKey
    || typeof value.name !== 'string'
    || !isSafeId(value.parentId)
    || typeof value.childIndex !== 'number'
    || !Number.isFinite(value.childIndex)
    || !isFinitePair(value.point)
    || (value.rotation !== undefined
      && (typeof value.rotation !== 'number' || !Number.isFinite(value.rotation)))
    || (value.label !== undefined && typeof value.label !== 'string')
    || (value.labelPoint !== undefined && !isFinitePair(value.labelPoint))) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  for (const flag of COMMON_SHAPE_OPTIONAL.slice(1)) {
    if (value[flag] !== undefined && typeof value[flag] !== 'boolean') {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
  }
  const style = validateStyle(value.style);
  if (style.kind !== 'valid') return style;
  if ((type === 'rectangle' || type === 'triangle' || type === 'sticky' || type === 'group')
    && !isPositiveFinitePair(value.size)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (type === 'ellipse' && !isPositiveFinitePair(value.radius)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (type === 'draw') {
    if (!Array.isArray(value.points)
      || value.points.length === 0
      || value.points.some((point) => !Array.isArray(point)
        || point.length !== 3
        || point.some((coordinate) => typeof coordinate !== 'number' || !Number.isFinite(coordinate))
        || point[2] < 0
        || point[2] > 1)
      || typeof value.isComplete !== 'boolean') {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
  }
  if ((type === 'text' || type === 'sticky') && typeof value.text !== 'string') {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (type === 'arrow') {
    if (typeof value.bend !== 'number'
      || !Number.isFinite(value.bend)
      || !isPlainRecord(value.handles)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    const handlesKeys = hasExactKeys(value.handles, ['start', 'bend', 'end']);
    if (handlesKeys === 'unsupported') {
      return { kind: 'unsupported', errorCode: 'document_feature_unsupported' };
    }
    if (handlesKeys === 'invalid') {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    const identities = {
      start: 0,
      bend: 2,
      end: 1,
    } as const;
    for (const [handleId, index] of Object.entries(identities)) {
      const handle = value.handles[handleId];
      if (!isPlainRecord(handle)) {
        return { kind: 'invalid', errorCode: 'document_schema_invalid' };
      }
      const handleKeys = hasExactKeys(handle, ['id', 'index', 'point'], ['canBind', 'bindingId']);
      if (handleKeys === 'unsupported') {
        return { kind: 'unsupported', errorCode: 'document_feature_unsupported' };
      }
      if (handleKeys === 'invalid'
        || handle.id !== handleId
        || handle.index !== index
        || !isFinitePair(handle.point)
        || (handle.canBind !== undefined && typeof handle.canBind !== 'boolean')
        || (handle.bindingId !== undefined && !isSafeId(handle.bindingId))
        || (handleId === 'bend' && handle.bindingId !== undefined)) {
        return { kind: 'invalid', errorCode: 'document_schema_invalid' };
      }
    }
    if (value.decorations !== undefined) {
      if (!isPlainRecord(value.decorations)) {
        return { kind: 'invalid', errorCode: 'document_schema_invalid' };
      }
      const decorationKeys = hasExactKeys(value.decorations, [], ['start', 'middle', 'end']);
      if (decorationKeys === 'unsupported') {
        return { kind: 'unsupported', errorCode: 'document_feature_unsupported' };
      }
      if (decorationKeys === 'invalid'
        || Object.values(value.decorations).some((decoration) => decoration !== 'arrow')) {
        return { kind: 'invalid', errorCode: 'document_schema_invalid' };
      }
    }
  }
  if (type === 'group') {
    if (value.parentId !== pageId
      || !Array.isArray(value.children)
      || value.children.length === 0
      || value.children.some((childId) => !isSafeId(childId))
      || new Set(value.children).size !== value.children.length) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
  }
  return { kind: 'valid', value };
}

function validateShapes(value: unknown, pageId: string): ValidationResult<Record<string, Record<string, unknown>>> {
  if (!isPlainRecord(value)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  for (const [shapeId, shape] of Object.entries(value)) {
    if (!isSafeId(shapeId)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    const shapeResult = validateShape(shape, shapeId, pageId);
    if (shapeResult.kind !== 'valid') return shapeResult;
  }
  const groupOwners = new Map<string, string>();
  for (const shape of Object.values(value)) {
    if ((shape as Record<string, unknown>).type !== 'group') continue;
    const group = shape as Record<string, unknown>;
    for (const childId of group.children as string[]) {
      const child = value[childId];
      if (!isPlainRecord(child)
        || child.type === 'group'
        || child.parentId !== group.id
        || groupOwners.has(childId)) {
        return { kind: 'unsupported', errorCode: 'document_feature_unsupported' };
      }
      groupOwners.set(childId, group.id as string);
    }
  }
  const siblingIndexes = new Map<string, Set<number>>();
  for (const shape of Object.values(value)) {
    const record = shape as Record<string, unknown>;
    const parentId = record.parentId as string;
    if (parentId !== pageId && groupOwners.get(record.id as string) !== parentId) {
      return { kind: 'unsupported', errorCode: 'document_feature_unsupported' };
    }
    const indexes = siblingIndexes.get(parentId) ?? new Set<number>();
    const childIndex = record.childIndex as number;
    if (indexes.has(childIndex)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    indexes.add(childIndex);
    siblingIndexes.set(parentId, indexes);
  }
  return { kind: 'valid', value: value as Record<string, Record<string, unknown>> };
}

function validateBindings(
  value: unknown,
  shapes: Record<string, Record<string, unknown>>,
): ValidationResult<Record<string, Record<string, unknown>>> {
  if (!isPlainRecord(value)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  const owners = new Set<string>();
  for (const [bindingId, binding] of Object.entries(value)) {
    if (!isSafeId(bindingId) || !isPlainRecord(binding)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    const keys = hasExactKeys(
      binding,
      ['id', 'fromId', 'toId', 'handleId', 'distance', 'point'],
      ['type'],
    );
    if (keys !== 'exact') {
      return keys === 'unsupported'
        ? { kind: 'unsupported', errorCode: 'document_feature_unsupported' }
        : { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    if (binding.id !== bindingId
      || (binding.type !== undefined && binding.type !== 'arrow')
      || !isSafeId(binding.fromId)
      || !isSafeId(binding.toId)
      || !['start', 'end'].includes(binding.handleId as string)
      || typeof binding.distance !== 'number'
      || !Number.isFinite(binding.distance)
      || binding.distance < 0
      || !isFinitePair(binding.point)
      || binding.point.some((coordinate) => coordinate < 0 || coordinate > 1)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    const arrow = shapes[binding.fromId];
    const target = shapes[binding.toId];
    if (!arrow
      || arrow.type !== 'arrow'
      || !target
      || !['rectangle', 'ellipse', 'triangle', 'text', 'sticky', 'group'].includes(target.type as string)
      || binding.fromId === binding.toId
      || arrow.parentId === binding.toId) {
      return { kind: 'unsupported', errorCode: 'binding_unsupported' };
    }
    const owner = `${binding.fromId}\u0000${binding.handleId}`;
    const handle = (arrow.handles as Record<string, Record<string, unknown>>)[binding.handleId as string];
    if (owners.has(owner) || handle.bindingId !== bindingId) {
      return { kind: 'unsupported', errorCode: 'binding_unsupported' };
    }
    owners.add(owner);
  }
  for (const shape of Object.values(shapes)) {
    if (shape.type !== 'arrow') continue;
    const handles = shape.handles as Record<string, Record<string, unknown>>;
    for (const handleId of ['start', 'end']) {
      const bindingId = handles[handleId].bindingId;
      if (bindingId === undefined) continue;
      const binding = value[bindingId as string];
      if (!isPlainRecord(binding)
        || binding.fromId !== shape.id
        || binding.handleId !== handleId) {
        return { kind: 'unsupported', errorCode: 'binding_unsupported' };
      }
    }
  }
  return { kind: 'valid', value: value as Record<string, Record<string, unknown>> };
}

function validatePage(value: unknown, mapKey: string): ValidationResult<LegacyPage> {
  if (!isPlainRecord(value)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  const keyResult = hasExactKeys(value, ['id', 'shapes', 'bindings'], ['name', 'childIndex']);
  if (keyResult !== 'exact') {
    return keyResult === 'unsupported'
      ? { kind: 'unsupported', errorCode: 'document_feature_unsupported' }
      : { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (!isSafeId(value.id) || value.id !== mapKey) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (value.name !== undefined && typeof value.name !== 'string') {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (value.childIndex !== undefined
    && (typeof value.childIndex !== 'number' || !Number.isFinite(value.childIndex))) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  const shapes = validateShapes(value.shapes, mapKey);
  if (shapes.kind !== 'valid') return shapes;
  const bindings = validateBindings(value.bindings, shapes.value);
  if (bindings.kind !== 'valid') return bindings;
  return { kind: 'valid', value: value as unknown as LegacyPage };
}

function validatePageState(
  value: unknown,
  mapKey: string,
  shapes: Record<string, Record<string, unknown>>,
  bindings: Record<string, Record<string, unknown>>,
): ValidationResult<LegacyPageState> {
  if (!isPlainRecord(value)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  const keyResult = hasExactKeys(
    value,
    ['id', 'selectedIds', 'camera'],
    ['brush', 'pointedId', 'hoveredId', 'editingId', 'bindingId'],
  );
  if (keyResult !== 'exact') {
    return keyResult === 'unsupported'
      ? { kind: 'unsupported', errorCode: 'document_feature_unsupported' }
      : { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (!isSafeId(value.id) || value.id !== mapKey || !Array.isArray(value.selectedIds)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (value.selectedIds.some((id) => !isSafeId(id))
    || new Set(value.selectedIds).size !== value.selectedIds.length
    || value.selectedIds.some((id) => !Object.prototype.hasOwnProperty.call(shapes, id))) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (!isPlainRecord(value.camera)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  const cameraKeys = hasExactKeys(value.camera, ['point', 'zoom']);
  if (cameraKeys === 'unsupported') {
    return { kind: 'unsupported', errorCode: 'document_feature_unsupported' };
  }
  if (cameraKeys === 'invalid'
    || !isFinitePair(value.camera.point)
    || typeof value.camera.zoom !== 'number'
    || !Number.isFinite(value.camera.zoom)
    || value.camera.zoom < 0.1
    || value.camera.zoom > 5) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  for (const key of ['pointedId', 'hoveredId', 'editingId', 'bindingId'] as const) {
    const field = value[key];
    if (field !== undefined && field !== null && !isSafeId(field)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    if (field !== undefined && field !== null) {
      const target = key === 'bindingId' ? bindings : shapes;
      if (!Object.prototype.hasOwnProperty.call(target, field)) {
        return { kind: 'invalid', errorCode: 'document_schema_invalid' };
      }
    }
  }
  if (value.brush !== undefined && value.brush !== null) {
    if (!isPlainRecord(value.brush)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    const brush = value.brush;
    const brushKeys = hasExactKeys(
        brush,
        ['minX', 'minY', 'maxX', 'maxY', 'width', 'height'],
        ['rotation'],
      );
    if (brushKeys === 'unsupported') {
      return { kind: 'unsupported', errorCode: 'document_feature_unsupported' };
    }
    if (brushKeys === 'invalid'
      || ['minX', 'minY', 'maxX', 'maxY', 'width', 'height'].some(
        (key) => typeof brush[key] !== 'number' || !Number.isFinite(brush[key]),
      )
      || (brush.rotation !== undefined
        && (typeof brush.rotation !== 'number' || !Number.isFinite(brush.rotation)))) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
  }
  return { kind: 'valid', value: value as unknown as LegacyPageState };
}

export function validateLegacyDocument(value: unknown): ValidationResult<LegacyDocument> {
  if (!isPlainRecord(value)) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  const complexity = inspectComplexity(value);
  if (complexity.cyclic || complexity.unsafeJsonValue) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (complexity.tooComplex) {
    return { kind: 'unsupported', errorCode: 'document_too_complex' };
  }
  const keyResult = hasExactKeys(
    value,
    ['id', 'name', 'version', 'pages', 'pageStates', 'assets'],
    ['viewport'],
  );
  if (keyResult !== 'exact') {
    return keyResult === 'unsupported'
      ? { kind: 'unsupported', errorCode: 'document_feature_unsupported' }
      : { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (!isSafeId(value.id) || typeof value.name !== 'string') {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  if (value.version !== 15.5) {
    return { kind: 'unsupported', errorCode: 'document_version_unsupported' };
  }
  if (!isPlainRecord(value.pages)
    || !isPlainRecord(value.pageStates)
    || Object.keys(value.pages).length === 0
    || Object.keys(value.pages).length !== Object.keys(value.pageStates).length) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  let shapeCount = 0;
  let bindingCount = 0;
  let drawPointCount = 0;
  for (const [pageId, page] of Object.entries(value.pages)) {
    if (!isSafeId(pageId)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    const pageResult = validatePage(page, pageId);
    if (pageResult.kind !== 'valid') return pageResult;
    shapeCount += Object.keys(pageResult.value.shapes).length;
    bindingCount += Object.keys(pageResult.value.bindings).length;
    for (const shape of Object.values(pageResult.value.shapes)) {
      if (shape.type === 'draw') {
        drawPointCount += (shape.points as unknown[]).length;
      }
    }
    if (shapeCount > MAX_SHAPES
      || bindingCount > MAX_BINDINGS
      || drawPointCount > MAX_DRAW_POINTS) {
      return { kind: 'unsupported', errorCode: 'document_too_complex' };
    }
    const pageStateResult = validatePageState(
      value.pageStates[pageId],
      pageId,
      pageResult.value.shapes,
      pageResult.value.bindings,
    );
    if (pageStateResult.kind !== 'valid') return pageStateResult;
  }
  if (Object.keys(value.pageStates).some((pageId) => !Object.prototype.hasOwnProperty.call(value.pages, pageId))) {
    return { kind: 'invalid', errorCode: 'document_schema_invalid' };
  }
  const assets = validateEmptyRecord(value.assets);
  if (assets.kind !== 'valid') {
    return assets.kind === 'unsupported'
      ? { kind: 'unsupported', errorCode: 'assets_unsupported' }
      : assets;
  }
  if (value.viewport !== undefined) {
    if (!isPlainRecord(value.viewport)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    const viewportKeys = hasExactKeys(value.viewport, ['height']);
    if (viewportKeys === 'unsupported') {
      return { kind: 'unsupported', errorCode: 'document_feature_unsupported' };
    }
    if (viewportKeys === 'invalid'
      || typeof value.viewport.height !== 'number'
      || !Number.isFinite(value.viewport.height)) {
      return { kind: 'invalid', errorCode: 'document_schema_invalid' };
    }
    if (value.viewport.height < 200 || value.viewport.height > 4096) {
      return { kind: 'unsupported', errorCode: 'viewport_height_invalid' };
    }
  }
  if (utf8Encoder.encode(JSON.stringify(value)).byteLength > MAX_DECODED_JSON_BYTES) {
    return { kind: 'unsupported', errorCode: 'document_too_complex' };
  }
  return { kind: 'valid', value: value as unknown as LegacyDocument };
}
