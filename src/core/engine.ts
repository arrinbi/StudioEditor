import type { DocumentState, Layer, LayerSnapshot, HistoryItem } from '../types/editor';
import { renderDocumentComposite } from './export';

export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

export function sampleCanvasColor(doc: DocumentState, x: number, y: number): string {
  const docX = Math.floor(x);
  const docY = Math.floor(y);

  if (docX < 0 || docX >= doc.width || docY < 0 || docY >= doc.height) {
    return '#000000';
  }

  const compositeCanvas = renderDocumentComposite(doc);
  const ctx = compositeCanvas.getContext('2d');
  if (!ctx) return '#000000';

  const pixel = ctx.getImageData(docX, docY, 1, 1).data;
  const r = pixel[0].toString(16).padStart(2, '0');
  const g = pixel[1].toString(16).padStart(2, '0');
  const b = pixel[2].toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
}

export function serializeLayer(layer: Layer): LayerSnapshot {
  const base: LayerSnapshot = {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    isProtected: layer.isProtected,
    x: layer.x,
    y: layer.y,
    rotation: layer.rotation,
    scaleX: layer.scaleX,
    scaleY: layer.scaleY,
  };

  if (layer.type === 'raster' || layer.type === 'mask') {
    try {
      base.dataUrl = layer.canvas.toDataURL('image/png');
    } catch {
      base.dataUrl = '';
    }
    base.width = layer.canvas.width;
    base.height = layer.canvas.height;
  } else if (layer.type === 'image') {
    base.imageSrc = layer.src;
    base.width = layer.width;
    base.height = layer.height;
  } else if (layer.type === 'text') {
    base.text = layer.text;
    base.fontSize = layer.fontSize;
    base.fontFamily = layer.fontFamily;
    base.color = layer.color;
    base.width = layer.width;
    base.height = layer.height;
    base.align = layer.align;
    base.bold = layer.bold;
    base.italic = layer.italic;
  }

  return base;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    let resolved = false;

    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve(img);
      }
    };

    img.onload = done;
    img.onerror = done;
    img.src = src;

    if (img.complete) {
      done();
    } else {
      setTimeout(done, 50);
    }
  });
}

export async function deserializeLayer(snapshot: LayerSnapshot): Promise<Layer> {
  const base = {
    id: snapshot.id,
    name: snapshot.name,
    visible: snapshot.visible,
    locked: snapshot.locked,
    opacity: snapshot.opacity,
    isProtected: snapshot.isProtected,
    x: snapshot.x,
    y: snapshot.y,
    rotation: snapshot.rotation,
    scaleX: snapshot.scaleX,
    scaleY: snapshot.scaleY,
  };

  if (snapshot.type === 'raster' || snapshot.type === 'mask') {
    const canvas = createOffscreenCanvas(snapshot.width || 100, snapshot.height || 100);
    if (snapshot.dataUrl) {
      const img = await loadImage(snapshot.dataUrl);
      try {
        const ctx = canvas.getContext('2d');
        if (ctx && img.width > 0 && img.height > 0) {
          ctx.drawImage(img, 0, 0);
        }
      } catch {
        // ignore draw errors in test env
      }
    }
    return {
      ...base,
      type: snapshot.type,
      canvas,
    };
  }

  if (snapshot.type === 'image') {
    const img = snapshot.imageSrc ? await loadImage(snapshot.imageSrc) : new Image();
    return {
      ...base,
      type: 'image',
      image: img,
      src: snapshot.imageSrc || '',
      width: snapshot.width || img.width || 100,
      height: snapshot.height || img.height || 100,
    };
  }

  return {
    ...base,
    type: 'text',
    text: snapshot.text || '',
    fontSize: snapshot.fontSize || 16,
    fontFamily: snapshot.fontFamily || 'Arial',
    color: snapshot.color || '#ffffff',
    width: snapshot.width || 100,
    height: snapshot.height || 30,
    align: snapshot.align || 'left',
    bold: snapshot.bold,
    italic: snapshot.italic,
  };
}

export class HistoryManager {
  private stack: HistoryItem[] = [];
  private index: number = -1;
  private maxHistory: number = 30;

  public async recordAction(
    description: string,
    doc: DocumentState
  ): Promise<HistoryItem> {
    const snapshots = doc.layers.map(serializeLayer);
    const item: HistoryItem = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      description,
      timestamp: Date.now(),
      layersSnapshot: snapshots,
      activeLayerId: doc.activeLayerId,
      selection: doc.selection ? { ...doc.selection } : null,
    };

    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(item);

    if (this.stack.length > this.maxHistory) {
      this.stack.shift();
    } else {
      this.index++;
    }

    return item;
  }

  public get canUndo(): boolean {
    return this.index > 0;
  }

  public get canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  public get items(): HistoryItem[] {
    return [...this.stack];
  }

  public get currentIndex(): number {
    return this.index;
  }

  public async jumpTo(
    targetIndex: number,
    currentDoc: DocumentState
  ): Promise<DocumentState | null> {
    if (targetIndex < 0 || targetIndex >= this.stack.length) return null;
    this.index = targetIndex;
    const item = this.stack[this.index];

    const restoredLayers = await Promise.all(
      item.layersSnapshot.map((snap) => deserializeLayer(snap))
    );

    return {
      ...currentDoc,
      layers: restoredLayers,
      activeLayerId: item.activeLayerId,
      selection: item.selection ? { ...item.selection } : null,
    };
  }

  public async undo(currentDoc: DocumentState): Promise<DocumentState | null> {
    if (!this.canUndo) return null;
    return this.jumpTo(this.index - 1, currentDoc);
  }

  public async redo(currentDoc: DocumentState): Promise<DocumentState | null> {
    if (!this.canRedo) return null;
    return this.jumpTo(this.index + 1, currentDoc);
  }
}
