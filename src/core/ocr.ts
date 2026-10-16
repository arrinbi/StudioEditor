import type { Page, OcrRegion, DocumentState } from '../types/editor';
import { renderDocumentComposite } from './export';
import { createOffscreenCanvas } from './engine';

/**
 * Adds new OCR regions to a page using either 'replace' or 'merge' mode.
 */
export function addOcrRegions(
  page: Page,
  newRegions: OcrRegion[],
  mode: 'replace' | 'merge' = 'replace'
): Page {
  const existing = page.ocrRegions || [];
  let updatedRegions: OcrRegion[];

  if (mode === 'replace') {
    // In replace mode, replace automated OCR regions while preserving manually created regions
    const manualRegions = existing.filter((r) => r.source === 'manual');
    updatedRegions = [...manualRegions, ...newRegions];
  } else {
    // Merge mode: append new regions, avoiding exact duplicates by ID or bbox & text
    const filteredNew = newRegions.filter((nr) => {
      return !existing.some(
        (er) =>
          er.id === nr.id ||
          (er.text === nr.text &&
            Math.abs(er.bbox.x - nr.bbox.x) < 5 &&
            Math.abs(er.bbox.y - nr.bbox.y) < 5 &&
            Math.abs(er.bbox.width - nr.bbox.width) < 5 &&
            Math.abs(er.bbox.height - nr.bbox.height) < 5)
      );
    });
    updatedRegions = [...existing, ...filteredNew];
  }

  return {
    ...page,
    ocrRegions: updatedRegions,
    selectedOcrRegionId: updatedRegions.length > 0 ? updatedRegions[0].id : null,
  };
}

/**
 * Adds a manually created text region to a page.
 */
export function addManualOcrRegion(
  page: Page,
  bbox: { x: number; y: number; width: number; height: number },
  text: string = ''
): { page: Page; regionId: string } {
  const existing = page.ocrRegions || [];
  const normalizedBBox = {
    x: Math.round(bbox.x),
    y: Math.round(bbox.y),
    width: Math.max(5, Math.round(bbox.width)),
    height: Math.max(5, Math.round(bbox.height)),
  };

  const newId = `manual_region_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const manualRegion: OcrRegion = {
    id: newId,
    pageId: page.id,
    text,
    confidence: 100,
    bbox: normalizedBBox,
    sourceWidth: page.width,
    sourceHeight: page.height,
    source: 'manual',
  };

  const updatedRegions = [...existing, manualRegion];

  return {
    page: {
      ...page,
      ocrRegions: updatedRegions,
      selectedOcrRegionId: newId,
    },
    regionId: newId,
  };
}

/**
 * Updates the recognized text for a specific OCR region on a page, preserving region ID and metadata.
 */
export function updateOcrRegionText(
  page: Page,
  regionId: string,
  newText: string
): Page {
  const existing = page.ocrRegions || [];
  const updatedRegions = existing.map((r) =>
    r.id === regionId ? { ...r, text: newText } : r
  );

  return {
    ...page,
    ocrRegions: updatedRegions,
  };
}

/**
 * Updates the bounding box for a specific OCR region on a page.
 */
export function updateOcrRegionBBox(
  page: Page,
  regionId: string,
  newBBox: { x: number; y: number; width: number; height: number }
): Page {
  const existing = page.ocrRegions || [];
  const updatedRegions = existing.map((r) =>
    r.id === regionId
      ? {
          ...r,
          bbox: {
            x: Math.round(newBBox.x),
            y: Math.round(newBBox.y),
            width: Math.max(5, Math.round(newBBox.width)),
            height: Math.max(5, Math.round(newBBox.height)),
          },
        }
      : r
  );

  return {
    ...page,
    ocrRegions: updatedRegions,
  };
}

/**
 * Deletes a specific OCR region from a page.
 */
export function deleteOcrRegion(
  page: Page,
  regionId: string
): Page {
  const existing = page.ocrRegions || [];
  const updatedRegions = existing.filter((r) => r.id !== regionId);
  const nextSelectedId =
    page.selectedOcrRegionId === regionId
      ? updatedRegions.length > 0
        ? updatedRegions[0].id
        : null
      : page.selectedOcrRegionId;

  return {
    ...page,
    ocrRegions: updatedRegions,
    selectedOcrRegionId: nextSelectedId,
  };
}

/**
 * Clears all OCR regions from a page.
 */
export function clearAllOcrRegions(page: Page): Page {
  return {
    ...page,
    ocrRegions: [],
    selectedOcrRegionId: null,
  };
}

/**
 * Sets the active selected OCR region ID for a page.
 */
export function selectOcrRegion(
  page: Page,
  regionId: string | null
): Page {
  return {
    ...page,
    selectedOcrRegionId: regionId,
  };
}

/**
 * Extracts a clean HTMLCanvasElement from either a specific layer or full page composite,
 * free of editor overlays, selection marquee handles, and UI overlays.
 */
export function extractOcrSourceCanvas(
  page: Page,
  targetLayerId?: string | null
): HTMLCanvasElement {
  if (targetLayerId && targetLayerId !== 'composite') {
    const layer = page.layers.find((l) => l.id === targetLayerId);
    if (layer) {
      if (layer.type === 'raster' || layer.type === 'mask') {
        return layer.canvas;
      }
      if (layer.type === 'image') {
        const offscreen = createOffscreenCanvas(page.width, page.height);
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(
            layer.image,
            layer.x,
            layer.y,
            layer.width,
            layer.height
          );
        }
        return offscreen;
      }
    }
  }

  // Default: Page Composite
  const docState: DocumentState = {
    id: page.id,
    name: page.name,
    width: page.width,
    height: page.height,
    layers: page.layers,
    activeLayerId: page.activeLayerId,
    selection: null,
  };

  return renderDocumentComposite(docState);
}
