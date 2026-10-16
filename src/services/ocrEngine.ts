import { createWorker, type Worker } from 'tesseract.js';
import type { OcrRegion } from '../types/editor';
import type { OcrProviderConfig } from './aiSettings';
import { getOcrConfig } from './aiSettings';
import {
  getOcrAdapter,
  generatePageSegments,
  postProcessOcrRegions,
} from './ocr';

export type OcrLanguage = 'eng' | 'ind' | 'eng+ind';

export interface OcrProgress {
  status: string;
  progress: number;
  currentSegment?: number;
  totalSegments?: number;
  failedSegments?: number[];
}

export interface RunOcrOptions {
  lang?: OcrLanguage;
  pageId: string;
  sourceWidth: number;
  sourceHeight: number;
  config?: OcrProviderConfig;
  onProgress?: (progress: OcrProgress) => void;
  signal?: AbortSignal;
  retrySegmentIndex?: number;
  existingRegions?: OcrRegion[];
}

let mockOcrFn: ((imageSource: HTMLCanvasElement | HTMLImageElement | string, options: RunOcrOptions) => Promise<OcrRegion[]>) | null = null;

/**
 * Set a mock OCR implementation for unit testing.
 */
export function setMockOcrEngine(
  mockFn: typeof mockOcrFn
): void {
  mockOcrFn = mockFn;
}

/**
 * Runs OCR on the provided image source using either Tesseract or configured AI OCR vision providers.
 */
export async function runOcrEngine(
  imageSource: HTMLCanvasElement | HTMLImageElement | string,
  options: RunOcrOptions
): Promise<OcrRegion[]> {
  if (mockOcrFn) {
    return mockOcrFn(imageSource, options);
  }

  const config = options.config || getOcrConfig();

  // Validate API key upfront for AI vision providers
  if (config.provider !== 'tesseract' && (!config.apiKey || !config.apiKey.trim())) {
    const providerLabel =
      config.provider === 'gemini'
        ? 'Google Gemini API'
        : config.provider === 'openai'
        ? 'OpenAI API'
        : 'OpenAI-Compatible API';
    throw new Error(`${providerLabel} Key is required. Please configure your API key in Settings.`);
  }

  // Convert imageSource to canvas if HTMLCanvasElement
  let sourceCanvas: HTMLCanvasElement;
  if (imageSource instanceof HTMLCanvasElement) {
    sourceCanvas = imageSource;
  } else {
    // For Tesseract fallback or element
    return runTesseractFallback(imageSource, options);
  }

  // Generate page segments
  const segments = generatePageSegments(sourceCanvas, {
    maxSegmentHeight: config.maxSegmentHeight,
    overlapHeight: config.overlapHeight,
    pageId: options.pageId,
  });

  const totalSegments = segments.length;
  options.onProgress?.({
    status: `Prepared ${totalSegments} segment${totalSegments === 1 ? '' : 's'} for processing...`,
    progress: 0.05,
    currentSegment: 0,
    totalSegments,
  });

  const adapter = getOcrAdapter(config.provider);
  const collectedRegions: OcrRegion[] = [];
  const failedSegments: number[] = [];
  const segmentErrors: string[] = [];

  // Filter segments if retrying a specific segment
  const targetSegments =
    options.retrySegmentIndex !== undefined && options.retrySegmentIndex >= 0
      ? segments.filter((s) => s.segmentIndex === options.retrySegmentIndex)
      : segments;

  for (let idx = 0; idx < targetSegments.length; idx++) {
    if (options.signal?.aborted) {
      throw new Error('OCR operation canceled by user.');
    }

    const seg = targetSegments[idx];
    const segDisplayNum = seg.segmentIndex + 1;

    options.onProgress?.({
      status: `Processing segment ${segDisplayNum} of ${totalSegments} (${adapter.name})...`,
      progress: Math.round(((idx + 0.1) / targetSegments.length) * 100) / 100,
      currentSegment: segDisplayNum,
      totalSegments,
      failedSegments,
    });

    try {
      const segRegions = await adapter.recognizeSegment(seg, config, options.signal);
      collectedRegions.push(...segRegions);
    } catch (err) {
      if (options.signal?.aborted) {
        throw new Error('OCR operation canceled by user.');
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Segment ${segDisplayNum} OCR failed: ${msg}`);
      failedSegments.push(seg.segmentIndex);
      segmentErrors.push(msg);
    }
  }

  // If ALL target segments failed, throw an error so handleRunOcr displays failure feedback
  if (targetSegments.length > 0 && failedSegments.length === targetSegments.length) {
    const primaryError = segmentErrors[0] || 'OCR failed for all image segments.';
    throw new Error(primaryError);
  }

  // Combine with existing regions if retrying a segment
  let allRegions = collectedRegions;
  if (options.retrySegmentIndex !== undefined && options.existingRegions) {
    const existingOther = options.existingRegions.filter((r) => {
      // Retain regions not from the retried segment area
      const targetSeg = segments.find((s) => s.segmentIndex === options.retrySegmentIndex);
      if (!targetSeg) return true;

      const segTop = targetSeg.offsetY;
      const segBottom = targetSeg.offsetY + targetSeg.segmentHeight;
      return r.bbox.y < segTop || r.bbox.y > segBottom;
    });

    allRegions = [...existingOther, ...collectedRegions];
  }

  // Deduplicate and sort final regions
  options.onProgress?.({
    status: 'Deduplicating and formatting bounding boxes...',
    progress: 0.95,
    currentSegment: totalSegments,
    totalSegments,
    failedSegments,
  });

  const finalRegions = postProcessOcrRegions(
    allRegions,
    options.sourceWidth,
    options.sourceHeight
  );

  options.onProgress?.({
    status: failedSegments.length > 0
      ? `Completed with warnings (${failedSegments.length} segment(s) failed).`
      : 'Complete',
    progress: 1,
    currentSegment: totalSegments,
    totalSegments,
    failedSegments,
  });

  return finalRegions;
}

/**
 * Runs OCR on a specifically cropped region of the source canvas.
 * Maps relative coordinates from the cropped image back to full-page pixel coordinates.
 */
export async function runCropOcrEngine(
  croppedCanvas: HTMLCanvasElement,
  cropBBox: { x: number; y: number; width: number; height: number },
  options: RunOcrOptions
): Promise<OcrRegion[]> {
  const normX = Math.round(cropBBox.x);
  const normY = Math.round(cropBBox.y);
  const normW = Math.max(5, Math.round(cropBBox.width));
  const normH = Math.max(5, Math.round(cropBBox.height));

  const config = options.config || getOcrConfig();

  // If using local Tesseract or fallback, run directly on cropped canvas to ensure precise local OCR
  let rawRegions: OcrRegion[] = [];
  if (config.provider === 'tesseract') {
    rawRegions = await runTesseractFallback(croppedCanvas, {
      ...options,
      sourceWidth: normW,
      sourceHeight: normH,
    });
  } else {
    // For AI vision adapters or mock engine
    if (mockOcrFn) {
      rawRegions = await mockOcrFn(croppedCanvas, {
        ...options,
        sourceWidth: normW,
        sourceHeight: normH,
      });
    } else {
      const adapter = getOcrAdapter(config.provider);
      rawRegions = await adapter.recognizeSegment(
        {
          canvas: croppedCanvas,
          segmentIndex: 0,
          totalSegments: 1,
          offsetX: 0,
          offsetY: 0,
          segmentWidth: normW,
          segmentHeight: normH,
          sourceWidth: options.sourceWidth,
          sourceHeight: options.sourceHeight,
          pageId: options.pageId,
        },
        config,
        options.signal
      );
    }
  }

  // Filter out empty results and map relative crop coordinates back to full page
  const mappedRegions: OcrRegion[] = [];
  for (const r of rawRegions) {
    if (r.text && r.text.trim().length > 0) {
      mappedRegions.push({
        ...r,
        id: r.id || `ocr_crop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        pageId: options.pageId,
        bbox: {
          x: normX + Math.round(r.bbox.x),
          y: normY + Math.round(r.bbox.y),
          width: Math.max(5, Math.round(r.bbox.width)),
          height: Math.max(5, Math.round(r.bbox.height)),
        },
        sourceWidth: options.sourceWidth,
        sourceHeight: options.sourceHeight,
        source: r.source || 'ocr',
      });
    }
  }

  // If OCR recognized text inside crop, return mapped regions
  if (mappedRegions.length > 0) {
    return mappedRegions;
  }

  // Fallback: If OCR produced no text, return a single region covering the user's selected box
  return [
    {
      id: `manual_ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pageId: options.pageId,
      text: '',
      confidence: 100,
      bbox: {
        x: normX,
        y: normY,
        width: normW,
        height: normH,
      },
      sourceWidth: options.sourceWidth,
      sourceHeight: options.sourceHeight,
      source: 'manual',
    },
  ];
}

export async function runTesseractFallback(
  imageSource: HTMLCanvasElement | HTMLImageElement | string,
  options: RunOcrOptions
): Promise<OcrRegion[]> {
  const lang = options.lang || 'eng';
  const langArg = lang === 'eng+ind' ? ['eng', 'ind'] : lang;

  let worker: Worker | null = null;

  try {
    options.onProgress?.({ status: 'Initializing OCR worker...', progress: 0 });

    worker = await createWorker(langArg, 1, {
      logger: (m) => {
        if (options.onProgress && m.status) {
          const statusMsg =
            m.status === 'loading tesseract core'
              ? 'Loading OCR Core...'
              : m.status === 'initializing tesseract'
              ? 'Initializing Engine...'
              : m.status === 'loading language traineddata'
              ? `Loading language data (${lang})...`
              : m.status === 'initializing api'
              ? 'Initializing API...'
              : m.status === 'recognizing text'
              ? 'Recognizing text...'
              : m.status;

          options.onProgress({
            status: statusMsg,
            progress: typeof m.progress === 'number' ? Math.round(m.progress * 100) / 100 : 0,
          });
        }
      },
    });

    options.onProgress?.({ status: 'Recognizing text...', progress: 0.5 });
    const result = await worker.recognize(imageSource);
    options.onProgress?.({ status: 'Processing results...', progress: 0.95 });

    const regions: OcrRegion[] = [];
    const extractedItems: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> = [];

    const blocks = result.data.blocks;
    if (blocks && blocks.length > 0) {
      for (const block of blocks) {
        if (block.paragraphs && block.paragraphs.length > 0) {
          for (const para of block.paragraphs) {
            if (para.lines && para.lines.length > 0) {
              for (const line of para.lines) {
                const text = line.text ? line.text.trim() : '';
                if (text) {
                  extractedItems.push({
                    text,
                    confidence: line.confidence,
                    bbox: line.bbox,
                  });
                }
              }
            } else if (para.text && para.text.trim()) {
              extractedItems.push({
                text: para.text.trim(),
                confidence: para.confidence,
                bbox: para.bbox,
              });
            }
          }
        } else if (block.text && block.text.trim()) {
          extractedItems.push({
            text: block.text.trim(),
            confidence: block.confidence,
            bbox: block.bbox,
          });
        }
      }
    }

    if (extractedItems.length > 0) {
      for (const item of extractedItems) {
        const { x0, y0, x1, y1 } = item.bbox;
        const width = Math.max(1, Math.round(x1 - x0));
        const height = Math.max(1, Math.round(y1 - y0));

        regions.push({
          id: `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          pageId: options.pageId,
          text: item.text,
          confidence: Math.round(item.confidence ?? 0),
          bbox: {
            x: Math.round(x0),
            y: Math.round(y0),
            width,
            height,
          },
          sourceWidth: options.sourceWidth,
          sourceHeight: options.sourceHeight,
        });
      }
    }

    options.onProgress?.({ status: 'Complete', progress: 1 });
    return regions;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`OCR processing failed: ${errorMsg}`);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore termination error
      }
    }
  }
}
