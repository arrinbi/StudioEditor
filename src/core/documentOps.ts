import type { DocumentState, Layer, SelectionRect } from '../types/editor';
import { createOffscreenCanvas } from './engine';

export function cropDocument(doc: DocumentState, rect: SelectionRect): DocumentState {
  const cropX = Math.round(rect.x);
  const cropY = Math.round(rect.y);
  const newWidth = Math.max(1, Math.round(rect.width));
  const newHeight = Math.max(1, Math.round(rect.height));

  const updatedLayers: Layer[] = doc.layers.map((layer) => {
    if (layer.type === 'raster' || layer.type === 'mask') {
      const newCanvas = createOffscreenCanvas(newWidth, newHeight);
      const ctx = newCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(layer.canvas, layer.x - cropX, layer.y - cropY);
      }
      return {
        ...layer,
        x: 0,
        y: 0,
        canvas: newCanvas,
      };
    } else {
      return {
        ...layer,
        x: layer.x - cropX,
        y: layer.y - cropY,
      };
    }
  });

  return {
    ...doc,
    width: newWidth,
    height: newHeight,
    layers: updatedLayers,
    selection: null,
  };
}

export type AnchorPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export function resizeCanvas(
  doc: DocumentState,
  newWidth: number,
  newHeight: number,
  anchor: AnchorPosition = 'center'
): DocumentState {
  const targetW = Math.max(1, Math.round(newWidth));
  const targetH = Math.max(1, Math.round(newHeight));

  let dx = 0;
  let dy = 0;

  if (anchor.includes('center') || anchor === 'middle-left' || anchor === 'middle-right') {
    if (anchor === 'center' || anchor === 'top-center' || anchor === 'bottom-center') {
      dx = Math.round((targetW - doc.width) / 2);
    }
    if (anchor === 'center' || anchor === 'middle-left' || anchor === 'middle-right') {
      dy = Math.round((targetH - doc.height) / 2);
    }
  }

  if (anchor.includes('right')) {
    dx = targetW - doc.width;
  }
  if (anchor.includes('bottom')) {
    dy = targetH - doc.height;
  }

  const updatedLayers: Layer[] = doc.layers.map((layer) => {
    if (layer.type === 'raster' || layer.type === 'mask') {
      const newCanvas = createOffscreenCanvas(targetW, targetH);
      const ctx = newCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(layer.canvas, layer.x + dx, layer.y + dy);
      }
      return {
        ...layer,
        x: 0,
        y: 0,
        canvas: newCanvas,
      };
    } else {
      return {
        ...layer,
        x: layer.x + dx,
        y: layer.y + dy,
      };
    }
  });

  return {
    ...doc,
    width: targetW,
    height: targetH,
    layers: updatedLayers,
  };
}

export function rotateDocument(doc: DocumentState, degrees: 90 | -90 | 180): DocumentState {
  const is90 = Math.abs(degrees) === 90;
  const newWidth = is90 ? doc.height : doc.width;
  const newHeight = is90 ? doc.width : doc.height;

  const updatedLayers: Layer[] = doc.layers.map((layer) => {
    if (layer.type === 'raster' || layer.type === 'mask') {
      const newCanvas = createOffscreenCanvas(newWidth, newHeight);
      const ctx = newCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        if (degrees === 90) {
          ctx.translate(newWidth, 0);
          ctx.rotate(Math.PI / 2);
        } else if (degrees === -90) {
          ctx.translate(0, newHeight);
          ctx.rotate(-Math.PI / 2);
        } else if (degrees === 180) {
          ctx.translate(newWidth, newHeight);
          ctx.rotate(Math.PI);
        }
        ctx.drawImage(layer.canvas, layer.x, layer.y);
        ctx.restore();
      }
      return {
        ...layer,
        x: 0,
        y: 0,
        canvas: newCanvas,
      };
    } else {
      let newX = layer.x;
      let newY = layer.y;
      const layerW = layer.width || 0;
      const layerH = layer.height || 0;

      if (degrees === 90) {
        newX = doc.height - layer.y - layerH;
        newY = layer.x;
      } else if (degrees === -90) {
        newX = layer.y;
        newY = doc.width - layer.x - layerW;
      } else if (degrees === 180) {
        newX = doc.width - layer.x - layerW;
        newY = doc.height - layer.y - layerH;
      }

      const newRotation = ((layer.rotation || 0) + degrees + 360) % 360;

      return {
        ...layer,
        x: newX,
        y: newY,
        rotation: newRotation,
      };
    }
  });

  return {
    ...doc,
    width: newWidth,
    height: newHeight,
    layers: updatedLayers,
  };
}

export function flipDocument(doc: DocumentState, direction: 'horizontal' | 'vertical'): DocumentState {
  const updatedLayers: Layer[] = doc.layers.map((layer) => {
    if (layer.type === 'raster' || layer.type === 'mask') {
      const newCanvas = createOffscreenCanvas(doc.width, doc.height);
      const ctx = newCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        if (direction === 'horizontal') {
          ctx.translate(doc.width, 0);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(0, doc.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(layer.canvas, layer.x, layer.y);
        ctx.restore();
      }
      return {
        ...layer,
        x: 0,
        y: 0,
        canvas: newCanvas,
      };
    } else {
      let newX = layer.x;
      let newY = layer.y;
      let scaleX = layer.scaleX ?? 1;
      let scaleY = layer.scaleY ?? 1;

      if (direction === 'horizontal') {
        newX = doc.width - layer.x - (layer.width || 0);
        scaleX = -scaleX;
      } else {
        newY = doc.height - layer.y - (layer.height || 0);
        scaleY = -scaleY;
      }

      return {
        ...layer,
        x: newX,
        y: newY,
        scaleX,
        scaleY,
      };
    }
  });

  return {
    ...doc,
    layers: updatedLayers,
  };
}
