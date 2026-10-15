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

    // Translate to layer position
    ctx.translate(layer.x, layer.y);

    if (layer.rotation) {
      ctx.rotate((layer.rotation * Math.PI) / 180);
    }

    if (layer.scaleX !== undefined || layer.scaleY !== undefined) {
      ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
    }

    if (layer.type === 'raster' || layer.type === 'mask') {
      ctx.drawImage(layer.canvas, 0, 0);
    } else if (layer.type === 'image') {
      ctx.drawImage(layer.image, 0, 0, layer.width, layer.height);
    } else if (layer.type === 'text') {
      ctx.fillStyle = layer.color;
      let fontStyle = '';
      if (layer.bold) fontStyle += 'bold ';
      if (layer.italic) fontStyle += 'italic ';
      ctx.font = `${fontStyle}${layer.fontSize}px ${layer.fontFamily}`.trim();
      ctx.textBaseline = 'top';
      ctx.textAlign = layer.align || 'left';

      let xOffset = 0;
      if (layer.align === 'center') {
        xOffset = layer.width / 2;
      } else if (layer.align === 'right') {
        xOffset = layer.width;
      }

      const lines = layer.text.split('\n');
      const lineHeight = layer.fontSize * 1.2;
      lines.forEach((line, index) => {
        ctx.fillText(line, xOffset, index * lineHeight);
      });
    }

    ctx.restore();
  }

  return exportCanvas;
}

export function exportDocumentFile(
  doc: DocumentState,
  format: 'png' | 'jpg' | 'webp',
  filename?: string
): string {
  const compositeCanvas = renderDocumentComposite(doc);
  let mimeType = 'image/png';
  if (format === 'jpg') mimeType = 'image/jpeg';
  else if (format === 'webp') mimeType = 'image/webp';

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
