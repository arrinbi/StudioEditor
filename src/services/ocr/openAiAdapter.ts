import type { OcrProviderAdapter, OcrSegmentInput } from './types';
import type { OcrProviderConfig } from '../aiSettings';
import { buildApiEndpointUrl } from '../aiSettings';
import type { OcrRegion } from '../../types/editor';
import { processRawDetectedRegions, type RawDetectedBox } from './validate';

export class OpenAiOcrAdapter implements OcrProviderAdapter {
  id = 'openai';
  name = 'OpenAI API & OpenAI-Compatible';

  async recognizeSegment(
    input: OcrSegmentInput,
    config: OcrProviderConfig,
    signal?: AbortSignal
  ): Promise<OcrRegion[]> {
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new Error('API Key is required.');
    }

    const apiKey = config.apiKey.trim();
    const defaultBase = config.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.sumopod.com/v1';
    const { requestUrl: url } = buildApiEndpointUrl(config.baseUrl, defaultBase, '/chat/completions');
    const model = config.model || 'gpt-4o-mini';

    const dataUrl = input.canvas.toDataURL('image/jpeg', 0.92);

    const targetLangNotice =
      config.targetLanguage && config.targetLanguage !== 'auto'
        ? `Primary language is ${config.targetLanguage}. `
        : '';

    const promptText = `You are a high-precision OCR vision system for comic and manhwa text detection.
Extract ALL readable dialogue text, captions, and text regions in this image segment.
${targetLangNotice}
CRITICAL BOUNDING BOX RULES:
- Output tight bounding boxes fitted around the text lines or paragraph blocks inside speech bubbles.
- Do NOT draw a bounding box around the whole speech bubble outline or the entire page.
- Output relative coordinates in percentage (0-100) or pixel coordinates within this segment.

Return ONLY a valid JSON object matching this schema:
{
  "regions": [
    {
      "text": "Recognized text string",
      "bbox": [x, y, width, height]
    }
  ]
}`;

    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      // Fallback if provider doesn't support response_format: { type: 'json_object' }
      if (!res.ok && res.status === 400) {
        delete requestBody.response_format;
        res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal,
        });
      }
    } catch (fetchErr) {
      const rawErrStr = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      const isNetworkError = rawErrStr.toLowerCase().includes('failed to fetch') || rawErrStr.toLowerCase().includes('networkerror');

      if (isNetworkError) {
        throw new Error(
          `Network/CORS error connecting to ${url}: The browser blocked the cross-origin vision request or the endpoint was unreachable. Ensure CORS headers are enabled or use a backend proxy.`
        );
      }
      throw new Error(`Network error requesting ${url}: ${rawErrStr}`);
    }

    if (!res.ok) {
      let errDetail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errDetail = errJson.error.message;
        }
      } catch {
        // ignore JSON error
      }
      throw new Error(`OpenAI API Error (${res.status}): ${errDetail}`);
    }

    const responseData = await res.json();
    const candidateText =
      responseData?.choices?.[0]?.message?.content || '';

    if (!candidateText) {
      return [];
    }

    let parsedJson: { regions?: RawDetectedBox[] } = {};
    try {
      const cleanJsonStr = candidateText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      parsedJson = JSON.parse(cleanJsonStr);
    } catch {
      throw new Error('Failed to parse JSON response from OpenAI API.');
    }

    const rawRegions = parsedJson.regions || [];
    return processRawDetectedRegions(rawRegions, input);
  }
}
