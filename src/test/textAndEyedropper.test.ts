import { describe, it, expect } from 'vitest';
import type { DocumentState, TextLayer } from '../types/editor';
import {
  createOffscreenCanvas,
  serializeLayer,
  deserializeLayer,
  sampleCanvasColor,
} from '../core/engine';
import { renderDocumentComposite } from '../core/export';

describe('Text Layer & Eyedropper Functionality', () => {
  it('serializes and deserializes text layers cleanly with font and transform properties', async () => {
    const textLayer: TextLayer = {
      id: 'text_1',
      name: 'Sample Text',
      type: 'text',
      visible: true,
      locked: false,
      opacity: 0.9,
      x: 10,
      y: 20,
      rotation: 45,
      scaleX: 1.5,
      scaleY: 1.5,
      text: 'Hello World',
      fontSize: 24,
      fontFamily: 'Georgia',
      color: '#ff0000',
      width: 150,
      height: 40,
      align: 'center',
      bold: true,
      italic: false,
    };

    const snapshot = serializeLayer(textLayer);
    expect(snapshot.text).toBe('Hello World');
    expect(snapshot.fontSize).toBe(24);
    expect(snapshot.fontFamily).toBe('Georgia');
    expect(snapshot.color).toBe('#ff0000');
    expect(snapshot.align).toBe('center');
    expect(snapshot.bold).toBe(true);
    expect(snapshot.rotation).toBe(45);

    const restored = await deserializeLayer(snapshot);
    expect(restored.type).toBe('text');
    if (restored.type === 'text') {
      expect(restored.text).toBe('Hello World');
      expect(restored.fontSize).toBe(24);
      expect(restored.fontFamily).toBe('Georgia');
      expect(restored.color).toBe('#ff0000');
      expect(restored.align).toBe('center');
      expect(restored.bold).toBe(true);
      expect(restored.rotation).toBe(45);
    }
  });

  it('samples visible canvas pixel color using sampleCanvasColor', () => {
    const canvas = createOffscreenCanvas(100, 100);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(0, 0, 100, 100);
    }

    const doc: DocumentState = {
      id: 'doc_test',
      name: 'Color Sample Doc',
      width: 100,
      height: 100,
      layers: [
        {
          id: 'layer_bg',
          name: 'Green BG',
          type: 'raster',
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
          canvas,
        },
      ],
      activeLayerId: 'layer_bg',
      selection: null,
    };

    const sampled = sampleCanvasColor(doc, 50, 50);
    expect(sampled).toBe('#00ff00');
  });

  it('renders text layer in composite canvas without errors', () => {
    const textLayer: TextLayer = {
      id: 'text_2',
      name: 'Composite Text',
      type: 'text',
      visible: true,
      locked: false,
      opacity: 1,
      x: 5,
      y: 5,
      text: 'Composite Test\nLine 2',
      fontSize: 20,
      fontFamily: 'Arial',
      color: '#0000ff',
      width: 100,
      height: 50,
      align: 'left',
    };

    const doc: DocumentState = {
      id: 'doc_text_comp',
      name: 'Text Comp Doc',
      width: 100,
      height: 100,
      layers: [textLayer],
      activeLayerId: textLayer.id,
      selection: null,
    };

    const composite = renderDocumentComposite(doc);
    expect(composite).toBeInstanceOf(HTMLCanvasElement);
    expect(composite.width).toBe(100);
    expect(composite.height).toBe(100);
  });
});
