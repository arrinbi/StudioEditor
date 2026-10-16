import { createOffscreenCanvas } from '../../core/engine';
import type { OcrSegmentInput } from './types';

export interface SegmentationOptions {
  maxSegmentHeight?: number; // e.g. 1500px
  overlapHeight?: number;    // e.g. 150px
  pageId: string;
}

/**
 * Creates image segments for a source canvas according to max height and overlap limits.
 */
export function generatePageSegments(
  sourceCanvas: HTMLCanvasElement,
  options: SegmentationOptions
): OcrSegmentInput[] {
  const maxH = Math.max(500, options.maxSegmentHeight || 1500);
  const overlapH = Math.max(20, Math.min(maxH / 2, options.overlapHeight || 150));

  const totalW = sourceCanvas.width;
  const totalH = sourceCanvas.height;

  // Single segment if image height fits within limit
  if (totalH <= maxH) {
    return [
      {
        canvas: sourceCanvas,
        segmentIndex: 0,
        totalSegments: 1,
        offsetY: 0,
        offsetX: 0,
        segmentWidth: totalW,
        segmentHeight: totalH,
        pageId: options.pageId,
        sourceWidth: totalW,
        sourceHeight: totalH,
      },
    ];
  }

  // Calculate slice steps
  const step = maxH - overlapH;
  const numSegments = Math.ceil((totalH - overlapH) / step);

  const segments: OcrSegmentInput[] = [];

  for (let i = 0; i < numSegments; i++) {
    let startY = i * step;
    let segHeight = maxH;

    // Adjust last segment to fit remaining canvas height exactly
    if (startY + segHeight > totalH) {
      segHeight = totalH - startY;
      if (segHeight < 200 && i > 0) {
        // If remaining slice is too tiny, adjust startY backwards
        startY = Math.max(0, totalH - maxH);
        segHeight = totalH - startY;
      }
    }

    const segCanvas = createOffscreenCanvas(totalW, segHeight);
    const ctx = segCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        sourceCanvas,
        0,
        startY,
        totalW,
        segHeight,
        0,
        0,
        totalW,
        segHeight
      );
    }

    segments.push({
      canvas: segCanvas,
      segmentIndex: i,
      totalSegments: numSegments,
      offsetY: startY,
      offsetX: 0,
      segmentWidth: totalW,
      segmentHeight: segHeight,
      pageId: options.pageId,
      sourceWidth: totalW,
      sourceHeight: totalH,
    });
  }

  return segments;
}
