import { describe, it, expect } from 'vitest';
import type { DocumentState, TextLayer } from '../types/editor';
import { createOffscreenCanvas } from '../core/engine';
import {
  cropDocument,
  resizeCanvas,
  rotateDocument,
  flipDocument,
} from '../core/documentOps';

function createTestDoc(): DocumentState {
  const canvas = createOffscreenCanvas(200, 100);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(100, 0, 100, 100);
  }

  const textLayer: TextLayer = {
    id: 'text_1',
    name: 'Label',
    type: 'text',
    visible: true,
    locked: false,
    opacity: 1,
    x: 10,
    y: 10,
    text: 'Test',
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#ffffff',
    width: 50,
    height: 20,
  };

  return {
    id: 'doc_ops',
    name: 'Doc Ops',
    width: 200,
    height: 100,
    layers: [
      {
        id: 'layer_bg',
        name: 'Background',
        type: 'raster',
        visible: true,
        locked: false,
        opacity: 1,
        x: 0,
        y: 0,
        canvas,
      },
      textLayer,
    ],
    activeLayerId: 'layer_bg',
    selection: { x: 50, y: 10, width: 100, height: 80 },
  };
}

describe('Document Operations (Crop, Resize, Rotate, Flip)', () => {
  it('crops document to selection rect and clears active selection', () => {
    const doc = createTestDoc();
    const cropped = cropDocument(doc, doc.selection!);

    expect(cropped.width).toBe(100);
    expect(cropped.height).toBe(80);
    expect(cropped.selection).toBeNull();
    expect(cropped.layers[0].type).toBe('raster');
    if (cropped.layers[0].type === 'raster') {
      expect(cropped.layers[0].canvas.width).toBe(100);
      expect(cropped.layers[0].canvas.height).toBe(80);
    }
    // Text layer x and y shifted relative to crop rect (10 - 50 = -40, 10 - 10 = 0)
    expect(cropped.layers[1].x).toBe(-40);
    expect(cropped.layers[1].y).toBe(0);
  });

  it('resizes canvas with anchor position', () => {
    const doc = createTestDoc();
    const resized = resizeCanvas(doc, 300, 200, 'center');

    expect(resized.width).toBe(300);
    expect(resized.height).toBe(200);
    if (resized.layers[0].type === 'raster') {
      expect(resized.layers[0].canvas.width).toBe(300);
      expect(resized.layers[0].canvas.height).toBe(200);
    }
    // Offset for center anchor: (300-200)/2 = 50, (200-100)/2 = 50
    expect(resized.layers[1].x).toBe(10 + 50);
    expect(resized.layers[1].y).toBe(10 + 50);
  });

  it('rotates document 90 degrees clockwise and counter-clockwise', () => {
    const doc = createTestDoc();
    const rotated90 = rotateDocument(doc, 90);

    expect(rotated90.width).toBe(100);
    expect(rotated90.height).toBe(200);
    expect(rotated90.layers[1].rotation).toBe(90);

    const rotatedCCW = rotateDocument(doc, -90);
    expect(rotatedCCW.width).toBe(100);
    expect(rotatedCCW.height).toBe(200);
    expect(rotatedCCW.layers[1].rotation).toBe(270);
  });

  it('flips document horizontally and vertically', () => {
    const doc = createTestDoc();
    const flippedH = flipDocument(doc, 'horizontal');

    expect(flippedH.width).toBe(200);
    expect(flippedH.height).toBe(100);
    expect(flippedH.layers[1].scaleX).toBe(-1);

    const flippedV = flipDocument(doc, 'vertical');
    expect(flippedV.layers[1].scaleY).toBe(-1);
  });
});
