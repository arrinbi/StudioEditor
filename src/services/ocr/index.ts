import type { OcrProviderAdapter } from './types';
import type { OcrProviderType } from '../aiSettings';
import { GeminiOcrAdapter } from './geminiAdapter';
import { OpenAiOcrAdapter } from './openAiAdapter';
import { TesseractOcrAdapter } from './tesseractAdapter';

export * from './types';
export * from './validate';
export * from './testConnection';
export * from './segmentation';
export * from './postProcess';

const adapters: Record<OcrProviderType, OcrProviderAdapter> = {
  gemini: new GeminiOcrAdapter(),
  openai: new OpenAiOcrAdapter(),
  'openai-compatible': new OpenAiOcrAdapter(),
  tesseract: new TesseractOcrAdapter(),
};

export function getOcrAdapter(provider: OcrProviderType): OcrProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    return adapters.tesseract;
  }
  return adapter;
}
