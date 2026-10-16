import type { OcrProviderConfig } from '../aiSettings';
import type { OcrRegion } from '../../types/editor';

export interface OcrSegmentInput {
  canvas: HTMLCanvasElement;
  segmentIndex: number;
  totalSegments: number;
  offsetY: number;
  offsetX: number;
  segmentWidth: number;
  segmentHeight: number;
  pageId: string;
  sourceWidth: number;
  sourceHeight: number;
}

export interface OcrProviderAdapter {
  id: string;
  name: string;
  recognizeSegment(
    input: OcrSegmentInput,
    config: OcrProviderConfig,
    signal?: AbortSignal
  ): Promise<OcrRegion[]>;
}
