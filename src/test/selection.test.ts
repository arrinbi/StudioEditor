import { describe, it, expect } from 'vitest';
import type { DocumentState, RasterLayer } from '../types/editor';
import { createOffscreenCanvas } from '../core/engine';
import { clearSelectionContent, fillSelectionContent, translateActiveLayer } from '../core/selection';

describe('Selection & Transform operations', () => {
  it('fills and clears selection area on active raster layer', () => {
    const canvas = createOffscreenCanvas(100, 100);
    const layer: RasterLayer = {
      id: 'r1',
      name: 'Layer 1',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas,
    };

    const doc: DocumentState = {
      id: 'd1',
      name: 'Test Doc',
      width: 100,
      height: 100,
      layers: [layer],
      activeLayerId: 'r1',
      selection: { x: 10, y: 10, width: 20, height: 20 },
    };

    const filled = fillSelectionContent(doc, '#0000ff');
    expect(filled).toBe(true);

    const ctx = canvas.getContext('2d')!;
    let pixel = ctx.getImageData(15, 15, 1, 1).data;
    expect(pixel[2]).toBeGreaterThan(200);

    const cleared = clearSelectionContent(doc);
    expect(cleared).toBe(true);

    pixel = ctx.getImageData(15, 15, 1, 1).data;
    expect(pixel[3]).toBe(0);
  });

  it('translates active layer position', () => {
    const canvas = createOffscreenCanvas(100, 100);
    const layer: RasterLayer = {
      id: 'r1',
      name: 'Layer 1',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas,
    };

    const doc: DocumentState = {
      id: 'd1',
      name: 'Test Doc',
      width: 100,
      height: 100,
      layers: [layer],
      activeLayerId: 'r1',
      selection: null,
    };

    const movedDoc = translateActiveLayer(doc, 15, -5);
    expect(movedDoc.layers[0].x).toBe(15);
    expect(movedDoc.layers[0].y).toBe(-5);
  });
});
