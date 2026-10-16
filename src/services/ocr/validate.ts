import type { OcrRegion } from '../../types/editor';
import type { OcrSegmentInput } from './types';

export interface RawDetectedBox {
  text: string;
  confidence?: number;
  bbox: number[]; // Can be [ymin, xmin, ymax, xmax] or [x, y, width, height]
}

/**
 * Validates, normalizes, and maps raw model bounding boxes from segment-relative coordinates
 * back to full page pixel coordinates.
 */
export function processRawDetectedRegions(
  rawItems: RawDetectedBox[],
  input: OcrSegmentInput
): OcrRegion[] {
  const regions: OcrRegion[] = [];

  for (const item of rawItems) {
    if (!item || typeof item.text !== 'string') continue;
    const cleanText = item.text.trim();
    if (!cleanText) continue;

    if (!Array.isArray(item.bbox) || item.bbox.length < 4) continue;

    let segX = 0;
    let segY = 0;
    let segW = 0;
    let segH = 0;

    const [b0, b1, b2, b3] = item.bbox.map((v) => (typeof v === 'number' ? v : parseFloat(v) || 0));

    // Case 1: [ymin, xmin, ymax, xmax] normalized in 0..1000 scale (Gemini standard)
    if (b2 > b0 && b3 > b1 && b2 <= 1000 && b3 <= 1000 && (b2 > 1.5 || b3 > 1.5)) {
      const ymin = b0;
      const xmin = b1;
      const ymax = b2;
      const xmax = b3;

      // Check if values are 0..1 or 0..1000
      const is0to1 = ymax <= 1.0 && xmax <= 1.0;
      const scale = is0to1 ? 1.0 : 1000.0;

      segX = (xmin / scale) * input.segmentWidth;
      segY = (ymin / scale) * input.segmentHeight;
      segW = ((xmax - xmin) / scale) * input.segmentWidth;
      segH = ((ymax - ymin) / scale) * input.segmentHeight;
    }
    // Case 2: [x, y, width, height] in percentages (0..100) or pixels
    else {
      let x = b0;
      let y = b1;
      let w = b2;
      let h = b3;

      // If x, y, w, h are percentage values <= 100
      if (x <= 100 && y <= 100 && w <= 100 && h <= 100 && (x > 0 || y > 0 || w > 0 || h > 0)) {
        // If all are <= 1, treats as 0..1 ratio
        if (x <= 1 && y <= 1 && w <= 1 && h <= 1) {
          segX = x * input.segmentWidth;
          segY = y * input.segmentHeight;
          segW = w * input.segmentWidth;
          segH = h * input.segmentHeight;
        } else {
          segX = (x / 100) * input.segmentWidth;
          segY = (y / 100) * input.segmentHeight;
          segW = (w / 100) * input.segmentWidth;
          segH = (h / 100) * input.segmentHeight;
        }
      } else {
        // Absolute pixel values in segment
        segX = x;
        segY = y;
        segW = w;
        segH = h;
      }
    }

    // Convert segment-relative coordinates to full-page coordinates
    const pageX = Math.round(segX + input.offsetX);
    const pageY = Math.round(segY + input.offsetY);
    const width = Math.round(segW);
    const height = Math.round(segH);

    // Coordinate validation & safety checks
    if (width < 5 || height < 5) continue;

    // Discard boxes covering > 90% of segment area if text is short (full-page box hallucination prevention)
    if (
      width > 0.9 * input.segmentWidth &&
      height > 0.9 * input.segmentHeight &&
      cleanText.length < 60
    ) {
      continue;
    }

    // Clamp coordinates within source image limits
    const clampedX = Math.max(0, Math.min(input.sourceWidth - 5, pageX));
    const clampedY = Math.max(0, Math.min(input.sourceHeight - 5, pageY));
    const clampedW = Math.max(5, Math.min(input.sourceWidth - clampedX, width));
    const clampedH = Math.max(5, Math.min(input.sourceHeight - clampedY, height));

    const confidence =
      typeof item.confidence === 'number' && !isNaN(item.confidence)
        ? Math.round(Math.max(0, Math.min(100, item.confidence)))
        : 90;

    regions.push({
      id: `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pageId: input.pageId,
      text: cleanText,
      confidence,
      bbox: {
        x: clampedX,
        y: clampedY,
        width: clampedW,
        height: clampedH,
      },
      sourceWidth: input.sourceWidth,
      sourceHeight: input.sourceHeight,
    });
  }

  return regions;
}
