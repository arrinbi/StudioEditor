import { describe, it, expect, beforeEach } from 'vitest';
import type { DocumentState, RasterLayer } from '../types/editor';
import { createOffscreenCanvas, serializeLayer, deserializeLayer, HistoryManager } from '../core/engine';

describe('Engine and History Manager', () => {
  let initialDoc: DocumentState;

  beforeEach(() => {
    const canvas1 = createOffscreenCanvas(100, 100);
    const ctx = canvas1.getContext('2d')!;
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 50, 50);

    const layer1: RasterLayer = {
      id: 'l1',
      name: 'Background Raster',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas: canvas1,
    };

    initialDoc = {
      id: 'doc1',
      name: 'Test Doc',
      width: 100,
      height: 100,
      layers: [layer1],
      activeLayerId: 'l1',
      selection: null,
    };
  });

  it('serializes and deserializes raster layers correctly', async () => {
    const layer = initialDoc.layers[0] as RasterLayer;
    const snap = serializeLayer(layer);
    expect(snap.id).toBe('l1');
    expect(snap.type).toBe('raster');
    expect(snap.dataUrl).toContain('data:image/png');

    const restored = (await deserializeLayer(snap)) as RasterLayer;
    expect(restored.id).toBe('l1');
    expect(restored.canvas.width).toBe(100);
    expect(restored.canvas.height).toBe(100);
  });

  it('handles history undo and redo accurately', async () => {
    const history = new HistoryManager();

    await history.recordAction('Initial Document', initialDoc);

    const canvas2 = createOffscreenCanvas(100, 100);
    const layer2: RasterLayer = {
      id: 'l2',
      name: 'New Layer',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas: canvas2,
    };

    const doc2: DocumentState = {
      ...initialDoc,
      layers: [...initialDoc.layers, layer2],
      activeLayerId: 'l2',
    };

    await history.recordAction('Add Layer', doc2);

    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    const undoneDoc = await history.undo(doc2);
    expect(undoneDoc).not.toBeNull();
    expect(undoneDoc!.layers.length).toBe(1);
    expect(undoneDoc!.activeLayerId).toBe('l1');
    expect(history.canRedo).toBe(true);

    const redoneDoc = await history.redo(undoneDoc!);
    expect(redoneDoc).not.toBeNull();
    expect(redoneDoc!.layers.length).toBe(2);
    expect(redoneDoc!.activeLayerId).toBe('l2');
  });
});
