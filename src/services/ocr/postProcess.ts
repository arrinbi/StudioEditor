import type { OcrRegion } from '../../types/editor';

/**
 * Calculates Intersection over Union (IoU) between two bounding boxes.
 */
export function calculateBBoxIoU(
  b1: { x: number; y: number; width: number; height: number },
  b2: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(b1.x, b2.x);
  const y1 = Math.max(b1.y, b2.y);
  const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
  const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

  const interWidth = Math.max(0, x2 - x1);
  const interHeight = Math.max(0, y2 - y1);
  const interArea = interWidth * interHeight;

  if (interArea <= 0) return 0;

  const area1 = b1.width * b1.height;
  const area2 = b2.width * b2.height;
  const unionArea = area1 + area2 - interArea;

  return unionArea > 0 ? interArea / unionArea : 0;
}

/**
 * Calculates text similarity score between two strings (0 to 1).
 */
export function calculateTextSimilarity(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().replace(/\s+/g, '');
  const str2 = s2.toLowerCase().replace(/\s+/g, '');

  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  if (str1.includes(str2) || str2.includes(str1)) {
    const minLen = Math.min(str1.length, str2.length);
    const maxLen = Math.max(str1.length, str2.length);
    return minLen / maxLen;
  }

  // Simple Character Overlap Ratio
  const set1 = new Set(str1.split(''));
  const set2 = new Set(str2.split(''));
  let common = 0;
  set1.forEach((ch) => {
    if (set2.has(ch)) common++;
  });

  return common / Math.max(set1.size, set2.size);
}

/**
 * Deduplicates overlapping OCR regions (e.g. from adjacent segment overlaps),
 * merges close duplicates, and sorts in top-to-bottom reading order.
 */
export function postProcessOcrRegions(
  regions: OcrRegion[],
  sourceWidth: number,
  sourceHeight: number
): OcrRegion[] {
  if (regions.length <= 1) return regions;

  const kept: OcrRegion[] = [];

  for (const region of regions) {
    // Check against already kept regions for duplicate match
    let isDuplicate = false;

    for (let i = 0; i < kept.length; i++) {
      const existing = kept[i];

      const iou = calculateBBoxIoU(region.bbox, existing.bbox);
      const textSim = calculateTextSimilarity(region.text, existing.text);

      // High spatial overlap OR high spatial overlap + text similarity
      if (iou > 0.4 || (iou > 0.15 && textSim > 0.6)) {
        isDuplicate = true;

        // Keep the region with longer / richer text or higher confidence
        if (
          region.text.length > existing.text.length ||
          (region.text.length === existing.text.length && region.confidence > existing.confidence)
        ) {
          // Replace existing with merged box
          const mergedX = Math.min(existing.bbox.x, region.bbox.x);
          const mergedY = Math.min(existing.bbox.y, region.bbox.y);
          const mergedW =
            Math.max(existing.bbox.x + existing.bbox.width, region.bbox.x + region.bbox.width) - mergedX;
          const mergedH =
            Math.max(existing.bbox.y + existing.bbox.height, region.bbox.y + region.bbox.height) - mergedY;

          kept[i] = {
            ...region,
            bbox: {
              x: mergedX,
              y: mergedY,
              width: mergedW,
              height: mergedH,
            },
          };
        }
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(region);
    }
  }

  // Final sanity check & sort by top-to-bottom, left-to-right reading order
  return kept
    .filter((r) => {
      // Reject full page boxes
      if (
        r.bbox.width > 0.92 * sourceWidth &&
        r.bbox.height > 0.92 * sourceHeight &&
        r.text.length < 80
      ) {
        return false;
      }
      return r.text.trim().length > 0 && r.bbox.width >= 5 && r.bbox.height >= 5;
    })
    .sort((a, b) => {
      const deltaY = a.bbox.y - b.bbox.y;
      if (Math.abs(deltaY) > 20) {
        return deltaY;
      }
      return a.bbox.x - b.bbox.x;
    });
}
