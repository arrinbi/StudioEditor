import jsPDF from 'jspdf';
import JSZip from 'jszip';
import type { DocumentState, ProjectState, Page } from '../types/editor';

export function pageToDocumentState(page: Page): DocumentState {
  return {
    id: page.id,
    name: page.name,
    width: page.width,
    height: page.height,
    layers: page.layers,
    activeLayerId: page.activeLayerId,
    selection: page.selection,
  };
}

export function renderDocumentComposite(doc: DocumentState): HTMLCanvasElement {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = Math.max(1, Math.floor(doc.width));
  exportCanvas.height = Math.max(1, Math.floor(doc.height));

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

export async function exportProjectToPDF(
  project: ProjectState,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (project.pages.length === 0) {
    throw new Error('Project has no pages to export.');
  }

  let pdf: jsPDF | null = null;
  const total = project.pages.length;

  for (let i = 0; i < total; i++) {
    const page = project.pages[i];
    if (onProgress) onProgress(i + 1, total);

    const docState = pageToDocumentState(page);
    const canvas = renderDocumentComposite(docState);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    const width = page.width;
    const height = page.height;
    const orientation = width > height ? 'landscape' : 'portrait';

    if (i === 0) {
      pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [width, height],
        hotfixes: ['pxScaling'],
      });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
    } else if (pdf) {
      pdf.addPage([width, height], orientation);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
    }
  }

  if (!pdf) {
    throw new Error('Failed to generate PDF document.');
  }

  const cleanProjectName = (project.name || 'Untitled_Project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanProjectName}.pdf`;

  const blob = pdf.output('blob');

  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return blob;
}

export async function exportProjectToZIP(
  project: ProjectState,
  format: 'png' | 'jpeg' = 'png',
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (project.pages.length === 0) {
    throw new Error('Project has no pages to export.');
  }

  const zip = new JSZip();
  const total = project.pages.length;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  for (let i = 0; i < total; i++) {
    const page = project.pages[i];
    if (onProgress) onProgress(i + 1, total);

    const docState = pageToDocumentState(page);
    const canvas = renderDocumentComposite(docState);
    const dataUrl = canvas.toDataURL(mimeType, 0.95);
    const base64Data = dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const padIndex = String(i + 1).padStart(3, '0');
    const filename = `page_${padIndex}.${ext}`;

    zip.file(filename, base64Data, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });

  const cleanProjectName = (project.name || 'Untitled_Project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const zipFileName = `${cleanProjectName}_pages.zip`;

  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return blob;
}
