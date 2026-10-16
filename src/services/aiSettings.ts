export type OcrProviderType = 'gemini' | 'openai' | 'openai-compatible' | 'tesseract';

export interface OcrProviderConfig {
  provider: OcrProviderType;
  apiKey: string;
  model: string;
  baseUrl: string;
  targetLanguage: string;
  maxSegmentHeight: number;
  overlapHeight: number;
  persistApiKey: boolean;
}

export const DEFAULT_MODELS: Record<OcrProviderType, string[]> = {
  gemini: ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
  'openai-compatible': ['gpt-4o', 'gpt-4o-mini', 'custom'],
  tesseract: ['eng+ind', 'eng', 'ind'],
};

export const DEFAULT_BASE_URLS: Partial<Record<OcrProviderType, string>> = {
  openai: 'https://api.openai.com/v1',
  'openai-compatible': 'https://api.sumopod.com/v1',
};

const SETTINGS_KEY = 'studioeditor_ai_ocr_settings';

export const DEFAULT_OCR_CONFIG: OcrProviderConfig = {
  provider: 'tesseract',
  apiKey: '',
  model: 'eng+ind',
  baseUrl: 'https://api.openai.com/v1',
  targetLanguage: 'auto',
  maxSegmentHeight: 1500,
  overlapHeight: 150,
  persistApiKey: false,
};

export function getOcrConfig(): OcrProviderConfig {
  try {
    // Check sessionStorage first
    const sessionData = sessionStorage.getItem(SETTINGS_KEY);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      return { ...DEFAULT_OCR_CONFIG, ...parsed };
    }

    // Check localStorage
    const localData = localStorage.getItem(SETTINGS_KEY);
    if (localData) {
      const parsed = JSON.parse(localData);
      return { ...DEFAULT_OCR_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load OCR provider settings:', err);
  }

  return { ...DEFAULT_OCR_CONFIG };
}

export function saveOcrConfig(config: OcrProviderConfig): void {
  try {
    const configToSave = { ...config };

    if (config.persistApiKey) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(configToSave));
      sessionStorage.removeItem(SETTINGS_KEY);
    } else {
      // Save to sessionStorage and save non-sensitive settings to localStorage without key
      sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(configToSave));

      const safeLocalConfig = { ...configToSave, apiKey: '' };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeLocalConfig));
    }
  } catch (err) {
    console.warn('Failed to save OCR provider settings:', err);
  }
}

export function clearOcrApiKeys(): void {
  try {
    sessionStorage.removeItem(SETTINGS_KEY);
    const localData = localStorage.getItem(SETTINGS_KEY);
    if (localData) {
      const parsed = JSON.parse(localData);
      parsed.apiKey = '';
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
    }
  } catch (err) {
    console.warn('Failed to clear OCR API keys:', err);
  }
}
