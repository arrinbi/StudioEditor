import type { OcrProviderAdapter, OcrSegmentInput } from './types';
import type { OcrProviderConfig } from '../aiSettings';
import type { OcrRegion } from '../../types/editor';
import { runOcrEngine, type OcrLanguage } from '../ocrEngine';

export class TesseractOcrAdapter implements OcrProviderAdapter {
  id = 'tesseract';
  name = 'Tesseract.js Local WASM';

  async recognizeSegment(
    input: OcrSegmentInput,
    config: OcrProviderConfig
  ): Promise<OcrRegion[]> {
    const lang = (config.model || 'eng+ind') as OcrLanguage;

    const segmentRegions = await runOcrEngine(input.canvas, {
      lang,
      pageId: input.pageId,
      sourceWidth: input.segmentWidth,
      sourceHeight: input.segmentHeight,
    });

    // Map segment-relative coordinates to full-page coordinates
    return segmentRegions.map((region) => ({
      ...region,
      bbox: {
        x: region.bbox.x + input.offsetX,
        y: region.bbox.y + input.offsetY,
        width: region.bbox.width,
        height: region.bbox.height,
      },
      sourceWidth: input.sourceWidth,
      sourceHeight: input.sourceHeight,
    }));
  }
}
