import type { LegacyDocument, Sha256Hex } from './types.js';

type FingerprintMode = 'codec' | 'editor';

type StoredRecord = Record<string, unknown>;

function orderedStyle(style: StoredRecord) {
  return [
    style.color,
    style.size,
    style.dash,
    style.font,
    style.textAlign,
    style.isFilled,
    style.scale,
  ];
}

function orderedHandle(handle: StoredRecord) {
  return [handle.id, handle.index, handle.point, handle.canBind, handle.bindingId];
}

function orderedShape(shape: StoredRecord) {
  const common = [
    shape.id,
    shape.type,
    shape.name,
    shape.parentId,
    shape.childIndex,
    shape.point,
    shape.rotation,
    orderedStyle(shape.style as StoredRecord),
    shape.isGhost,
    shape.isHidden,
    shape.isLocked,
    shape.isGenerated,
    shape.isAspectRatioLocked,
  ];
  switch (shape.type) {
    case 'rectangle':
    case 'triangle':
      return [...common, shape.size, shape.label, shape.labelPoint];
    case 'ellipse':
      return [...common, shape.radius, shape.label, shape.labelPoint];
    case 'draw':
      return [...common, shape.points, shape.isComplete];
    case 'arrow': {
      const handles = shape.handles as Record<string, StoredRecord>;
      const decorations = shape.decorations as StoredRecord | undefined;
      return [
        ...common,
        shape.bend,
        [
          orderedHandle(handles.start),
          orderedHandle(handles.bend),
          orderedHandle(handles.end),
        ],
        decorations === undefined
          ? undefined
          : [decorations.start, decorations.middle, decorations.end],
        shape.label,
        shape.labelPoint,
      ];
    }
    case 'text':
      return [...common, shape.text];
    case 'sticky':
      return [...common, shape.size, shape.text];
    case 'group':
      return [...common, shape.size, shape.children];
    default:
      throw new TypeError('Cannot canonicalize an unsupported shape type');
  }
}

function orderedBinding(binding: StoredRecord) {
  return [
    binding.id,
    binding.type,
    binding.fromId,
    binding.toId,
    binding.handleId,
    binding.distance,
    binding.point,
  ];
}

function orderedPageState(pageState: LegacyDocument['pageStates'][string], mode: FingerprintMode) {
  const ephemeral = mode === 'codec'
    ? [
      pageState.selectedIds,
      pageState.pointedId,
      pageState.hoveredId,
      pageState.editingId,
      pageState.bindingId,
    ]
    : [];
  return [
    pageState.id,
    [pageState.camera.point, pageState.camera.zoom],
    pageState.brush === undefined || pageState.brush === null
      ? pageState.brush
      : [
        pageState.brush.minX,
        pageState.brush.minY,
        pageState.brush.maxX,
        pageState.brush.maxY,
        pageState.brush.width,
        pageState.brush.height,
        pageState.brush.rotation,
      ],
    ephemeral,
  ];
}

export function canonicalizeLegacyDocument(
  document: LegacyDocument,
  mode: FingerprintMode,
): string {
  return JSON.stringify([
    'zenuml-whiteboard-v1',
    mode,
    document.id,
    document.name,
    document.version,
    Object.entries(document.pages).map(([pageId, page]) => [
      pageId,
      page.id,
      page.name,
      page.childIndex,
      Object.entries(page.shapes).map(([shapeId, shape]) => [
        shapeId,
        orderedShape(shape),
      ]),
      Object.entries(page.bindings).map(([bindingId, binding]) => [
        bindingId,
        orderedBinding(binding),
      ]),
    ]),
    Object.entries(document.pageStates).map(([pageId, pageState]) => [
      pageId,
      orderedPageState(pageState, mode),
    ]),
    Object.entries(document.assets),
    document.viewport === undefined ? null : document.viewport.height,
  ]);
}

export async function fingerprintLegacyDocument(
  document: LegacyDocument,
  sha256Hex: Sha256Hex,
): Promise<{ codec: string; editor: string }> {
  const codec = await sha256Hex(canonicalizeLegacyDocument(document, 'codec'));
  const editor = await sha256Hex(canonicalizeLegacyDocument(document, 'editor'));
  return { codec, editor };
}
