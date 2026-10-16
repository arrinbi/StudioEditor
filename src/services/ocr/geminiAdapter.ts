import type { OcrProviderAdapter, OcrSegmentInput } from './types';
import type { OcrProviderConfig } from '../aiSettings';
import type { OcrRegion } from '../../types/editor';
import { processRawDetectedRegions, type RawDetectedBox } from './validate';

export class GeminiOcrAdapter implements OcrProviderAdapter {
  id = 'gemini';
  name = 'Google Gemini API';

  async recognizeSegment(
    input: OcrSegmentInput,
    config: OcrProviderConfig,
    signal?: AbortSignal
  ): Promise<OcrRegion[]> {
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new Error('Google Gemini API Key is required.');
    }

    const model = config.model || 'gemini-1.5-flash';
    const apiKey = config.apiKey.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const dataUrl = input.canvas.toDataURL('image/jpeg', 0.92);
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

    const targetLangNotice =
      config.targetLanguage && config.targetLanguage !== 'auto'
        ? `Primary language is ${config.targetLanguage}. `
        : '';

    const promptText = `You are a high-precision OCR system for comic/manhwa pages.
Extract ALL visible text regions, dialogue bubbles, sound effects, and captions from this image segment.
${targetLangNotice}
CRITICAL INSTRUCTION FOR BOUNDING BOXES:
- Provide TIGHT bounding boxes fitted directly around the actual text lines or paragraph groups.
- Do NOT draw a bounding box around the entire speech bubble or background panel. Only encircle the readable text inside.
- Do NOT output a single full-page box covering the entire segment.

Return ONLY a valid JSON object matching this schema:
{
  "regions": [
    {
      "text": "Recognized text line or block",
      "bbox": [ymin, xmin, ymax, xmax]
    }
  ]
}
Where ymin, xmin, ymax, xmax are normalized integer coordinates from 0 to 1000 representing the bounding box bounds in this image segment.`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    });

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
      throw new Error(`Gemini API Error (${res.status}): ${errDetail}`);
    }

    const responseData = await res.json();
    const candidateText =
      responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
      throw new Error('Failed to parse structured JSON response from Gemini API.');
    }

    const rawRegions = parsedJson.regions || [];
    return processRawDetectedRegions(rawRegions, input);
  }
}
