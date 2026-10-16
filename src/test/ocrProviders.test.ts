import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOcrConfig,
  saveOcrConfig,
  clearOcrApiKeys,
  type OcrProviderConfig,
} from '../services/aiSettings';
import { generatePageSegments } from '../services/ocr/segmentation';
import { processRawDetectedRegions } from '../services/ocr/validate';
import { postProcessOcrRegions, calculateBBoxIoU } from '../services/ocr/postProcess';
import { GeminiOcrAdapter } from '../services/ocr/geminiAdapter';
import { OpenAiOcrAdapter } from '../services/ocr/openAiAdapter';
import { testProviderConnection } from '../services/ocr/testConnection';
import { createOffscreenCanvas } from '../core/engine';
import { saveProjectStateToIDB, loadProjectFromIDB } from '../services/storage';
import type { ProjectState } from '../types/editor';

describe('AI OCR Settings & Credential Isolation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should load default configuration when storage is empty', () => {
    const config = getOcrConfig();
    expect(config.provider).toBe('tesseract');
    expect(config.apiKey).toBe('');
    expect(config.maxSegmentHeight).toBe(1500);
    expect(config.persistApiKey).toBe(false);
  });

  it('should store API key in sessionStorage by default when persistApiKey is false', () => {
    const testConfig: OcrProviderConfig = {
      provider: 'gemini',
      apiKey: 'secret_gemini_key_123',
      model: 'gemini-1.5-flash',
      baseUrl: 'https://api.openai.com/v1',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: false,
    };

    saveOcrConfig(testConfig);

    const loadedSession = getOcrConfig();
    expect(loadedSession.apiKey).toBe('secret_gemini_key_123');

    // Verify key was stripped from localStorage
    const localRaw = localStorage.getItem('studioeditor_ai_ocr_settings');
    expect(localRaw).toBeDefined();
    const localParsed = JSON.parse(localRaw!);
    expect(localParsed.apiKey).toBe('');
  });

  it('should persist API key in localStorage when persistApiKey is true', () => {
    const testConfig: OcrProviderConfig = {
      provider: 'openai',
      apiKey: 'secret_openai_key_456',
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com/v1',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: true,
    };

    saveOcrConfig(testConfig);

    const loaded = getOcrConfig();
    expect(loaded.apiKey).toBe('secret_openai_key_456');

    const localRaw = localStorage.getItem('studioeditor_ai_ocr_settings');
    const localParsed = JSON.parse(localRaw!);
    expect(localParsed.apiKey).toBe('secret_openai_key_456');
  });

  it('should clear stored API keys via clearOcrApiKeys', () => {
    saveOcrConfig({
      provider: 'gemini',
      apiKey: 'key_to_clear',
      model: 'gemini-1.5-flash',
      baseUrl: '',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: true,
    });

    clearOcrApiKeys();

    const loaded = getOcrConfig();
    expect(loaded.apiKey).toBe('');
  });

  it('CRITICAL: should NEVER store API keys inside project state or IndexedDB project data', async () => {
    const project: ProjectState = {
      id: 'proj_key_test',
      name: 'Key Isolation Project',
      activePageId: 'page_1',
      pages: [
        {
          id: 'page_1',
          name: 'Page 1',
          width: 800,
          height: 1200,
          layers: [],
          activeLayerId: null,
          selection: null,
          ocrRegions: [
            {
              id: 'ocr_1',
              pageId: 'page_1',
              text: 'Clean Text',
              confidence: 90,
              bbox: { x: 10, y: 10, width: 100, height: 30 },
              sourceWidth: 800,
              sourceHeight: 1200,
            },
          ],
        },
      ],
    };

    await saveProjectStateToIDB(project);
    const restored = await loadProjectFromIDB('proj_key_test');

    const jsonStr = JSON.stringify(restored);
    expect(jsonStr).not.toContain('secret_gemini_key');
    expect(jsonStr).not.toContain('apiKey');
  });
});

describe('Manhwa Page Segmentation Manager', () => {
  it('should create a single segment for ordinary small pages', () => {
    const canvas = createOffscreenCanvas(800, 1000);
    const segments = generatePageSegments(canvas, {
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      pageId: 'page_1',
    });

    expect(segments.length).toBe(1);
    expect(segments[0].segmentWidth).toBe(800);
    expect(segments[0].segmentHeight).toBe(1000);
    expect(segments[0].offsetY).toBe(0);
  });

  it('should slice long vertical manhwa pages into sequential overlapping segments', () => {
    const canvas = createOffscreenCanvas(1080, 4000);
    const segments = generatePageSegments(canvas, {
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      pageId: 'page_1',
    });

    expect(segments.length).toBe(3);
    expect(segments[0].offsetY).toBe(0);
    expect(segments[1].offsetY).toBe(1350); // 1500 - 150 = 1350 step
    expect(segments[2].offsetY).toBe(2700);

    // Verify all segments have correct width matching original canvas
    segments.forEach((seg) => {
      expect(seg.segmentWidth).toBe(1080);
      expect(seg.sourceHeight).toBe(4000);
    });
  });
});

describe('Response Validation and Coordinate Mapping', () => {
  it('should accurately convert Gemini 0..1000 normalized coordinates to full page pixel coordinates', () => {
    const input = {
      canvas: createOffscreenCanvas(1000, 1500),
      segmentIndex: 1,
      totalSegments: 2,
      offsetY: 1350, // Segment offset on page
      offsetX: 0,
      segmentWidth: 1000,
      segmentHeight: 1500,
      pageId: 'page_1',
      sourceWidth: 1000,
      sourceHeight: 3000,
    };

    const rawGeminiBoxes = [
      {
        text: 'Dialogue Line in Segment 2',
        bbox: [100, 200, 300, 800], // ymin=100 (10%), xmin=200 (20%), ymax=300 (30%), xmax=800 (80%)
      },
    ];

    const regions = processRawDetectedRegions(rawGeminiBoxes, input);

    expect(regions.length).toBe(1);
    const r = regions[0];
    expect(r.text).toBe('Dialogue Line in Segment 2');

    // segX = (200/1000)*1000 = 200
    // segY = (100/1000)*1500 = 150
    // pageY = 150 + 1350 = 1500
    expect(r.bbox.x).toBe(200);
    expect(r.bbox.y).toBe(1500);
    expect(r.bbox.width).toBe(600); // (800-200)/1000 * 1000 = 600
    expect(r.bbox.height).toBe(300); // (300-100)/1000 * 1500 = 300
  });

  it('should reject invalid or full-page hallucinated bounding boxes', () => {
    const input = {
      canvas: createOffscreenCanvas(1000, 1000),
      segmentIndex: 0,
      totalSegments: 1,
      offsetY: 0,
      offsetX: 0,
      segmentWidth: 1000,
      segmentHeight: 1000,
      pageId: 'page_1',
      sourceWidth: 1000,
      sourceHeight: 1000,
    };

    const rawBoxes = [
      // Full page box with short text
      {
        text: 'Short',
        bbox: [0, 0, 1000, 1000],
      },
      // Tiny zero-width box
      {
        text: 'Tiny',
        bbox: [10, 10, 11, 11],
      },
      // Valid tight text box
      {
        text: 'Valid Text Box',
        bbox: [100, 100, 200, 500],
      },
    ];

    const regions = processRawDetectedRegions(rawBoxes, input);
    expect(regions.length).toBe(1);
    expect(regions[0].text).toBe('Valid Text Box');
  });
});

describe('Post-Processing and Deduplication', () => {
  it('should calculate IoU correctly between overlapping bounding boxes', () => {
    const b1 = { x: 0, y: 0, width: 100, height: 100 };
    const b2 = { x: 50, y: 0, width: 100, height: 100 };

    const iou = calculateBBoxIoU(b1, b2);
    // Intersection = 50 * 100 = 5000
    // Union = 10000 + 10000 - 5000 = 15000
    // IoU = 5000 / 15000 = 0.3333...
    expect(iou).toBeCloseTo(0.333, 2);
  });

  it('should deduplicate overlapping regions from adjacent segments and sort in reading order', () => {
    const rawRegions = [
      {
        id: 'r2',
        pageId: 'p1',
        text: 'Lower Speech Bubble',
        confidence: 90,
        bbox: { x: 100, y: 1200, width: 200, height: 80 },
        sourceWidth: 1000,
        sourceHeight: 2000,
      },
      {
        id: 'r1',
        pageId: 'p1',
        text: 'Upper Speech Bubble',
        confidence: 95,
        bbox: { x: 100, y: 100, width: 200, height: 80 },
        sourceWidth: 1000,
        sourceHeight: 2000,
      },
      // Overlapping duplicate of r2 in segment overlap
      {
        id: 'r2_dup',
        pageId: 'p1',
        text: 'Lower Speech Bubble',
        confidence: 88,
        bbox: { x: 102, y: 1205, width: 198, height: 78 },
        sourceWidth: 1000,
        sourceHeight: 2000,
      },
    ];

    const deduplicated = postProcessOcrRegions(rawRegions, 1000, 2000);

    expect(deduplicated.length).toBe(2);
    // Top-to-bottom reading order
    expect(deduplicated[0].text).toBe('Upper Speech Bubble');
    expect(deduplicated[1].text).toBe('Lower Speech Bubble');
  });
});

describe('OCR Provider Adapters & Mock Network Operations', () => {
  it('should parse Gemini vision response cleanly', async () => {
    const adapter = new GeminiOcrAdapter();
    const segInput = {
      canvas: createOffscreenCanvas(800, 1000),
      segmentIndex: 0,
      totalSegments: 1,
      offsetY: 0,
      offsetX: 0,
      segmentWidth: 800,
      segmentHeight: 1000,
      pageId: 'p1',
      sourceWidth: 800,
      sourceHeight: 1000,
    };

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  regions: [
                    {
                      text: 'Hello Gemini',
                      bbox: [100, 100, 200, 500],
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const regions = await adapter.recognizeSegment(segInput, {
      provider: 'gemini',
      apiKey: 'test_key',
      model: 'gemini-1.5-flash',
      baseUrl: '',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: false,
    });

    expect(regions.length).toBe(1);
    expect(regions[0].text).toBe('Hello Gemini');
    vi.restoreAllMocks();
  });

  it('should parse OpenAI / SumoPod vision response cleanly', async () => {
    const adapter = new OpenAiOcrAdapter();
    const segInput = {
      canvas: createOffscreenCanvas(800, 1000),
      segmentIndex: 0,
      totalSegments: 1,
      offsetY: 0,
      offsetX: 0,
      segmentWidth: 800,
      segmentHeight: 1000,
      pageId: 'p1',
      sourceWidth: 800,
      sourceHeight: 1000,
    };

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              regions: [
                {
                  text: 'Hello OpenAI',
                  bbox: [100, 100, 200, 500],
                },
              ],
            }),
          },
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const regions = await adapter.recognizeSegment(segInput, {
      provider: 'openai',
      apiKey: 'test_key',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: false,
    });

    expect(regions.length).toBe(1);
    expect(regions[0].text).toBe('Hello OpenAI');
    vi.restoreAllMocks();
  });

  it('should test provider connections cleanly', async () => {
    const tesseractRes = await testProviderConnection({
      provider: 'tesseract',
      apiKey: '',
      model: 'eng+ind',
      baseUrl: '',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: false,
    });
    expect(tesseractRes.success).toBe(true);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [] }),
    } as Response);

    const geminiRes = await testProviderConnection({
      provider: 'gemini',
      apiKey: 'valid_test_key',
      model: 'gemini-1.5-flash',
      baseUrl: '',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: false,
    });
    expect(geminiRes.success).toBe(true);
    vi.restoreAllMocks();
  });
});
