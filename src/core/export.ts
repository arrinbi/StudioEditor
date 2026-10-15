import type { DocumentState } from '../types/editor';

export function renderDocumentComposite(doc: DocumentState): HTMLCanvasElement {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = doc.width;
  exportCanvas.height = doc.height;

  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return exportCanvas;

  ctx.clearRect(0, 0, doc.width, doc.height);

  for (const layer of doc.layers) {
    if (!layer.visible) continue;

    ctx.save();
    ctx.globalAlpha = layer.opacity;

    if (layer.type === 'raster' || layer.type === 'mask') {
      ctx.drawImage(layer.canvas, layer.x, layer.y);
    } else if (layer.type === 'image') {
      ctx.drawImage(layer.image, layer.x, layer.y, layer.width, layer.height);
    } else if (layer.type === 'text') {
      ctx.fillStyle = layer.color;
      ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;
      ctx.textBaseline = 'top';
      ctx.fillText(layer.text, layer.x, layer.y);
    }

    ctx.restore();
  }

  return exportCanvas;
}

export function exportDocumentFile(doc: DocumentState, format: 'png' | 'jpg', filename?: string): string {
  const compositeCanvas = renderDocumentComposite(doc);
  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const dataUrl = compositeCanvas.toDataURL(mimeType, 0.95);

  const cleanName = (filename || doc.name || 'Untitled').replace(/\.[^/.]+$/, '');
  const downloadName = `${cleanName}_exported.${format}`;

  if (typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return dataUrl;
}
