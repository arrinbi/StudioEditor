import type { Page, ProjectState, Layer, RasterLayer, TextLayer } from '../types/editor';
import { createOffscreenCanvas } from './engine';
import { renderDocumentComposite } from './export';

export function createDefaultPage(
  width: number = 1080,
  height: number = 1620,
  name: string = 'Page 1'
): Page {
  const canvas = createOffscreenCanvas(width, height);
  const baseRasterId = 'base_raster_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  return {
    id: 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name,
    width,
    height,
    layers: [
      {
        id: baseRasterId,
        name: 'Base Raster Layer',
        type: 'raster',
        visible: true,
        locked: false,
        opacity: 1,
        x: 0,
        y: 0,
        canvas,
      },
    ],
    activeLayerId: baseRasterId,
    selection: null,
  };
}

export function createInitialProject(
  projectName: string = 'Untitled Project',
  width: number = 1080,
  height: number = 1620
): ProjectState {
  const firstPage = createDefaultPage(width, height, 'Page 1');
  firstPage.thumbnailDataUrl = renderPageThumbnail(firstPage);

  return {
    id: 'proj_' + Date.now(),
    name: projectName,
    activePageId: firstPage.id,
    pages: [firstPage],
  };
}

export function duplicatePage(page: Page): Page {
  const newLayers: Layer[] = page.layers.map((layer) => {
    if (layer.type === 'raster' || layer.type === 'mask') {
      const newCanvas = createOffscreenCanvas(layer.canvas.width, layer.canvas.height);
      const ctx = newCanvas.getContext('2d');
      ctx?.drawImage(layer.canvas, 0, 0);
      return {
        ...layer,
        id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        canvas: newCanvas,
      } as RasterLayer;
    } else if (layer.type === 'image') {
      return {
        ...layer,
        id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      };
    } else if (layer.type === 'text') {
      return {
        ...layer,
        id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      } as TextLayer;
    }
    return layer;
  });

  const duplicated: Page = {
    ...page,
    id: 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: `${page.name} Copy`,
    layers: newLayers,
    activeLayerId: newLayers.length > 0 ? newLayers[newLayers.length - 1].id : null,
    selection: page.selection ? { ...page.selection } : null,
  };

  duplicated.thumbnailDataUrl = renderPageThumbnail(duplicated);
  return duplicated;
}

export function reorderPages(pages: Page[], fromIndex: number, toIndex: number): Page[] {
  if (
    fromIndex < 0 ||
    fromIndex >= pages.length ||
    toIndex < 0 ||
    toIndex >= pages.length ||
    fromIndex === toIndex
  ) {
    return pages;
  }

  const result = [...pages];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

export function renderPageThumbnail(page: Page, maxWidth: number = 150): string {
  try {
    const composite = renderDocumentComposite({
      id: page.id,
      name: page.name,
      width: page.width,
      height: page.height,
      layers: page.layers,
      activeLayerId: page.activeLayerId,
      selection: page.selection,
    });

    const scale = maxWidth / Math.max(1, page.width);
    const thumbWidth = Math.max(1, Math.round(page.width * scale));
    const thumbHeight = Math.max(1, Math.round(page.height * scale));

    const thumbCanvas = createOffscreenCanvas(thumbWidth, thumbHeight);
    const ctx = thumbCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(composite, 0, 0, thumbWidth, thumbHeight);
      return thumbCanvas.toDataURL('image/jpeg', 0.7);
    }
    return composite.toDataURL('image/jpeg', 0.7);
  } catch {
    return '';
  }
}
