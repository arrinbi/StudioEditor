import { describe, it, expect } from 'vitest';
import type { DocumentState, RasterLayer } from '../types/editor';
import { createOffscreenCanvas } from '../core/engine';
import {
  applyPixelAdjustments,
  applyAdjustmentsToActiveLayer,
  rgbToHsl,
  hslToRgb,
  type AdjustmentSettings,
} from '../core/adjustments';

describe('Image Adjustments Engine', () => {
  it('converts RGB to HSL and back to RGB accurately', () => {
    const [h, s, l] = rgbToHsl(255, 0, 0); // pure red
    expect(Math.round(h)).toBe(0);
    expect(s).toBe(1);
    expect(l).toBe(0.5);

    const [r, g, b] = hslToRgb(h, s, l);
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('applies brightness and invert adjustments to ImageData', () => {
    const canvas = createOffscreenCanvas(2, 2);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000'; // black pixel
    ctx.fillRect(0, 0, 2, 2);

    const imgData = ctx.getImageData(0, 0, 2, 2);
    const invertSettings: AdjustmentSettings = {
      brightness: 0,
      contrast: 0,
      hue: 0,
      saturation: 0,
      invert: true,
    };

    applyPixelAdjustments(imgData, invertSettings);
    // Inverting black (#000000) produces white (#ffffff)
    expect(imgData.data[0]).toBe(255);
    expect(imgData.data[1]).toBe(255);
    expect(imgData.data[2]).toBe(255);
  });

  it('applies adjustments to active layer in document state', () => {
    const canvas = createOffscreenCanvas(10, 10);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 10, 10);

    const rasterLayer: RasterLayer = {
      id: 'layer_1',
      name: 'Active Layer',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas,
    };

    const doc: DocumentState = {
      id: 'doc_adj',
      name: 'Adj Doc',
      width: 10,
      height: 10,
      layers: [rasterLayer],
      activeLayerId: rasterLayer.id,
      selection: null,
    };

    const updatedDoc = applyAdjustmentsToActiveLayer(doc, {
      brightness: 50,
      contrast: 0,
      hue: 0,
      saturation: 0,
      invert: false,
    });

    expect(updatedDoc.layers[0].type).toBe('raster');
    const updatedCanvas = (updatedDoc.layers[0] as RasterLayer).canvas;
    const pixels = updatedCanvas.getContext('2d')!.getImageData(0, 0, 1, 1).data;
    // Brightness increase on red channel (255 stays clamped at 255, green & blue increase)
    expect(pixels[0]).toBe(255);
    expect(pixels[1]).toBeGreaterThan(0);
    expect(pixels[2]).toBeGreaterThan(0);
  });
});
