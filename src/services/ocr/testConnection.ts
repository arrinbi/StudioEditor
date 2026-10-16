import type { OcrProviderConfig } from '../aiSettings';
import { buildApiEndpointUrl } from '../aiSettings';

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
      const defaultBase = config.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.sumopod.com/v1';
      const { cleanBaseUrl, requestUrl } = buildApiEndpointUrl(config.baseUrl, defaultBase, '/models');

      let res: Response;
      try {
        res = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
      } catch (fetchErr) {
        const rawErrStr = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        const isNetworkError = rawErrStr.toLowerCase().includes('failed to fetch') || rawErrStr.toLowerCase().includes('networkerror');

        if (isNetworkError) {
          return {
            success: false,
            message: `Network/CORS error connecting to ${requestUrl}: The browser blocked the cross-origin request or the network endpoint was unreachable. (If using SumoPod/custom proxies in browser, ensure CORS headers 'Access-Control-Allow-Origin: *' are enabled, or use a local backend CORS proxy).`,
          };
        }
        return {
          success: false,
          message: `Network error connecting to ${requestUrl}: ${rawErrStr}`,
        };
      }

      if (!res.ok) {
        let errDetail = res.statusText || `HTTP ${res.status}`;
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
          message: `${
            config.provider === 'openai' ? 'OpenAI API' : 'OpenAI-Compatible Service'
          } returned status ${res.status}: ${errDetail}`,
        };
      }

      return {
        success: true,
        message: `Successfully connected to ${
          config.provider === 'openai' ? 'OpenAI API' : 'OpenAI-Compatible Service'
        } at ${cleanBaseUrl}.`,
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
