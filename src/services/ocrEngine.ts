import { createWorker, type Worker } from 'tesseract.js';
import type { OcrRegion } from '../types/editor';

export type OcrLanguage = 'eng' | 'ind' | 'eng+ind';

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface RunOcrOptions {
  lang?: OcrLanguage;
  pageId: string;
  sourceWidth: number;
  sourceHeight: number;
  onProgress?: (progress: OcrProgress) => void;
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
 * Runs OCR on the provided image source (canvas, HTMLImageElement, or data URL) using Tesseract.js.
 */
export async function runOcrEngine(
  imageSource: HTMLCanvasElement | HTMLImageElement | string,
  options: RunOcrOptions
): Promise<OcrRegion[]> {
  if (mockOcrFn) {
    return mockOcrFn(imageSource, options);
  }

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
    } else if (result.data.text && result.data.text.trim()) {
      const cleanText = result.data.text.trim();
      regions.push({
        id: `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        pageId: options.pageId,
        text: cleanText,
        confidence: Math.round(result.data.confidence ?? 0),
        bbox: {
          x: 10,
          y: 10,
          width: Math.max(100, options.sourceWidth - 20),
          height: Math.max(50, options.sourceHeight - 20),
        },
        sourceWidth: options.sourceWidth,
        sourceHeight: options.sourceHeight,
      });
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
