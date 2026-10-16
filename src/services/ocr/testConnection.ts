import type { OcrProviderConfig } from '../aiSettings';

export async function testProviderConnection(
  config: OcrProviderConfig
): Promise<{ success: boolean; message: string }> {
  if (config.provider === 'tesseract') {
    return {
      success: true,
      message: 'Tesseract.js local WASM OCR engine is available.',
    };
  }

  if (!config.apiKey || !config.apiKey.trim()) {
    return {
      success: false,
      message: 'API Key is missing. Please enter a valid key.',
    };
  }

  const apiKey = config.apiKey.trim();

  try {
    if (config.provider === 'gemini') {
      const model = config.model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${encodeURIComponent(
        apiKey
      )}`;

      const res = await fetch(url, { method: 'GET' });

      if (!res.ok) {
        let errDetail = res.statusText;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) {
            errDetail = errJson.error.message;
          }
        } catch {
          // ignore json parse error
        }
        return {
          success: false,
          message: `Gemini API test failed (${res.status}): ${errDetail}`,
        };
      }

      return {
        success: true,
        message: `Successfully connected to Google Gemini API (Model: ${model}).`,
      };
    }

    if (config.provider === 'openai' || config.provider === 'openai-compatible') {
      const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const url = `${baseUrl}/models`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        let errDetail = res.statusText;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) {
            errDetail = errJson.error.message;
          }
        } catch {
          // ignore json parse error
        }
        return {
          success: false,
          message: `OpenAI API test failed (${res.status}): ${errDetail}`,
        };
      }

      return {
        success: true,
        message: `Successfully connected to ${
          config.provider === 'openai' ? 'OpenAI API' : 'OpenAI-Compatible Service'
        } at ${baseUrl}.`,
      };
    }

    return {
      success: false,
      message: `Unsupported provider: ${config.provider}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Network error or failed request: ${errorMsg}`,
    };
  }
}
