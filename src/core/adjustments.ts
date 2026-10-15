import type { DocumentState, Layer } from '../types/editor';
import { createOffscreenCanvas } from './engine';

export interface AdjustmentSettings {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  hue: number; // -180 to 180
  saturation: number; // -100 to 100
  invert: boolean;
}

export const defaultAdjustmentSettings: AdjustmentSettings = {
  brightness: 0,
  contrast: 0,
  hue: 0,
  saturation: 0,
  invert: false,
};

export function clampPixel(val: number): number {
  return Math.max(0, Math.min(255, Math.round(val)));
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  let r = l;
  let g = l;
  let b = l;

  if (s !== 0) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [clampPixel(r * 255), clampPixel(g * 255), clampPixel(b * 255)];
}

export function applyPixelAdjustments(
  imageData: ImageData,
  settings: AdjustmentSettings
): ImageData {
  const data = imageData.data;
  const { brightness, contrast, hue, saturation, invert } = settings;

  const contrastFactor =
    contrast !== 0 ? (259 * (contrast + 255)) / (255 * (259 - contrast)) : 1;
  const brightnessOffset = brightness * 2.55;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    if (brightness !== 0) {
      r += brightnessOffset;
      g += brightnessOffset;
      b += brightnessOffset;
    }

    if (contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    r = clampPixel(r);
    g = clampPixel(g);
    b = clampPixel(b);

    if (hue !== 0 || saturation !== 0) {
      let [h, s, l] = rgbToHsl(r, g, b);
      if (hue !== 0) {
        h = (h + hue + 360) % 360;
      }
      if (saturation !== 0) {
        if (saturation > 0) {
          s = s + (1 - s) * (saturation / 100);
        } else {
          s = s * (1 + saturation / 100);
        }
      }
      [r, g, b] = hslToRgb(h, s, l);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  return imageData;
}

export function applyAdjustmentsToLayer(
  layer: Layer,
  settings: AdjustmentSettings
): Layer {
  if (layer.locked || layer.isProtected) return layer;

  if (layer.type === 'raster' || layer.type === 'mask') {
    const newCanvas = createOffscreenCanvas(layer.canvas.width, layer.canvas.height);
    const ctx = newCanvas.getContext('2d');
    if (!ctx) return layer;

    ctx.drawImage(layer.canvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
    applyPixelAdjustments(imgData, settings);
    ctx.putImageData(imgData, 0, 0);

    return {
      ...layer,
      canvas: newCanvas,
    };
  }

  if (layer.type === 'image') {
    const newCanvas = createOffscreenCanvas(layer.width, layer.height);
    const ctx = newCanvas.getContext('2d');
    if (!ctx) return layer;

    ctx.drawImage(layer.image, 0, 0, layer.width, layer.height);
    const imgData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
    applyPixelAdjustments(imgData, settings);
    ctx.putImageData(imgData, 0, 0);

    return {
      ...layer,
      type: 'raster',
      canvas: newCanvas,
    };
  }

  return layer;
}

export function applyAdjustmentsToActiveLayer(
  doc: DocumentState,
  settings: AdjustmentSettings
): DocumentState {
  if (!doc.activeLayerId) return doc;

  const targetIndex = doc.layers.findIndex((l) => l.id === doc.activeLayerId);
  if (targetIndex === -1) return doc;

  const target = doc.layers[targetIndex];
  if (target.locked || target.isProtected) return doc;

  const updatedLayer = applyAdjustmentsToLayer(target, settings);
  const updatedLayers = [...doc.layers];
  updatedLayers[targetIndex] = updatedLayer;

  return {
    ...doc,
    layers: updatedLayers,
  };
}
