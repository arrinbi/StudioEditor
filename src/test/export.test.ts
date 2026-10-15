import { describe, it, expect } from 'vitest';
import type { DocumentState, RasterLayer } from '../types/editor';
import { createOffscreenCanvas } from '../core/engine';
import { renderDocumentComposite, exportDocumentFile } from '../core/export';

describe('Document Export Pipeline', () => {
  it('renders composite at original pixel dimensions without scaling or distortion', () => {
    const canvas1 = createOffscreenCanvas(800, 1200);
    const ctx1 = canvas1.getContext('2d')!;
    ctx1.fillStyle = '#ff0000';
    ctx1.fillRect(0, 0, 800, 1200);

    const layer1: RasterLayer = {
      id: 'l1',
      name: 'Background',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas: canvas1,
    };

    const doc: DocumentState = {
      id: 'doc1',
      name: 'Scanlation_Chapter_1',
      width: 800,
      height: 1200,
      layers: [layer1],
      activeLayerId: 'l1',
      selection: { x: 50, y: 50, width: 200, height: 200 },
    };

    const composite = renderDocumentComposite(doc);

    expect(composite.width).toBe(800);
    expect(composite.height).toBe(1200);

    const dataUrlPng = exportDocumentFile(doc, 'png', 'test');
    expect(dataUrlPng).toContain('data:image/');

    const dataUrlJpg = exportDocumentFile(doc, 'jpg', 'test');
    expect(dataUrlJpg).toContain('data:image/');

    const dataUrlWebp = exportDocumentFile(doc, 'webp', 'test');
    expect(dataUrlWebp).toContain('data:image/');
  });
});
