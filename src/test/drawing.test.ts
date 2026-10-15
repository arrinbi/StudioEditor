import { describe, it, expect } from 'vitest';
import type { RasterLayer, ToolSettings } from '../types/editor';
import { createOffscreenCanvas } from '../core/engine';
import { drawRasterStroke } from '../core/drawing';

describe('Raster Drawing Engine', () => {
  const settings: ToolSettings = {
    brushSize: 10,
    brushColor: '#ff0000',
    brushOpacity: 1,
    brushHardness: 1,
    eraserSize: 10,
    eraserOpacity: 1,
  };

  it('draws a brush stroke on raster canvas layer', () => {
    const canvas = createOffscreenCanvas(100, 100);
    const layer: RasterLayer = {
      id: 'r1',
      name: 'Raster 1',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas,
    };

    drawRasterStroke(layer, { x: 10, y: 10 }, { x: 50, y: 50 }, settings, false);

    const ctx = canvas.getContext('2d')!;
    const pixel = ctx.getImageData(30, 30, 1, 1).data;
    expect(pixel[0]).toBeGreaterThan(200);
    expect(pixel[3]).toBeGreaterThan(200);
  });

  it('erases pixels on raster layer', () => {
    const canvas = createOffscreenCanvas(100, 100);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 100, 100);

    const layer: RasterLayer = {
      id: 'r1',
      name: 'Raster 1',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas,
    };

    drawRasterStroke(layer, { x: 40, y: 50 }, { x: 60, y: 50 }, settings, true);

    const erasedPixel = ctx.getImageData(50, 50, 1, 1).data;
    expect(erasedPixel[3]).toBeLessThan(50);
  });
});
