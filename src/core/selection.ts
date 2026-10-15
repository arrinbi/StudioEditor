import type { DocumentState } from '../types/editor';

export function clearSelectionContent(doc: DocumentState): boolean {
  if (!doc.selection || !doc.activeLayerId) return false;

  const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
  if (!layer || layer.type !== 'raster' || layer.locked) return false;

  const ctx = layer.canvas.getContext('2d');
  if (!ctx) return false;

  const sel = doc.selection;
  const relX = sel.x - layer.x;
  const relY = sel.y - layer.y;

  ctx.clearRect(relX, relY, sel.width, sel.height);
  return true;
}

export function fillSelectionContent(doc: DocumentState, color: string): boolean {
  if (!doc.selection || !doc.activeLayerId) return false;

  const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
  if (!layer || layer.type !== 'raster' || layer.locked) return false;

  const ctx = layer.canvas.getContext('2d');
  if (!ctx) return false;

  const sel = doc.selection;
  const relX = sel.x - layer.x;
  const relY = sel.y - layer.y;

  ctx.fillStyle = color;
  ctx.fillRect(relX, relY, sel.width, sel.height);
  return true;
}

export function translateActiveLayer(doc: DocumentState, dx: number, dy: number): DocumentState {
  if (!doc.activeLayerId) return doc;

  const updatedLayers = doc.layers.map((l) => {
    if (l.id === doc.activeLayerId && !l.locked) {
      return {
        ...l,
        x: l.x + dx,
        y: l.y + dy,
      };
    }
    return l;
  });

  return {
    ...doc,
    layers: updatedLayers,
  };
}
