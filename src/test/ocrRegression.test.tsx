import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OcrPanel } from '../components/OcrPanel';
import { TesseractOcrAdapter } from '../services/ocr/tesseractAdapter';
import { runOcrEngine } from '../services/ocrEngine';
import { saveOcrConfig } from '../services/aiSettings';
import { createOffscreenCanvas } from '../core/engine';
import type { Page, Layer } from '../types/editor';

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: {
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  {
                    text: 'Recognized Dialogue Text',
                    confidence: 92,
                    bbox: { x0: 50, y0: 100, x1: 250, y1: 160 },
                  },
                ],
              },
            ],
          },
        ],
      },
    }),
    terminate: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('Run Segmented OCR Regression & Execution Path', () => {
  let samplePage: Page;
  let sampleLayers: Layer[];

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();

    const canvas = createOffscreenCanvas(800, 1200);
    sampleLayers = [
      {
        id: 'layer-1',
        name: 'Background Layer',
        type: 'raster',
        visible: true,
        locked: false,
        opacity: 1,
        x: 0,
        y: 0,
        canvas,
      },
    ];

    samplePage = {
      id: 'page_1',
      name: 'Test Page',
      width: 800,
      height: 1200,
      layers: sampleLayers,
      activeLayerId: 'layer-1',
      selection: null,
      ocrRegions: [],
      selectedOcrRegionId: null,
    };
  });

  it('TesseractOcrAdapter does NOT trigger infinite recursion when recognizing a segment', async () => {
    const adapter = new TesseractOcrAdapter();
    const segInput = {
      canvas: createOffscreenCanvas(800, 1200),
      segmentIndex: 0,
      totalSegments: 1,
      offsetY: 0,
      offsetX: 0,
      segmentWidth: 800,
      segmentHeight: 1200,
      pageId: 'page_1',
      sourceWidth: 800,
      sourceHeight: 1200,
    };

    // Should resolve cleanly without RangeError: Maximum call stack size exceeded
    const regions = await adapter.recognizeSegment(segInput, {
      provider: 'tesseract',
      apiKey: '',
      model: 'eng+ind',
      baseUrl: '',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: false,
    });

    expect(Array.isArray(regions)).toBe(true);
    expect(regions.length).toBe(1);
    expect(regions[0].text).toBe('Recognized Dialogue Text');
  });

  it('runOcrEngine throws immediate error if AI provider API key is missing', async () => {
    const canvas = createOffscreenCanvas(800, 1200);

    await expect(
      runOcrEngine(canvas, {
        pageId: 'page_1',
        sourceWidth: 800,
        sourceHeight: 1200,
        config: {
          provider: 'gemini',
          apiKey: '',
          model: 'gemini-1.5-flash',
          baseUrl: '',
          targetLanguage: 'auto',
          maxSegmentHeight: 1500,
          overlapHeight: 150,
          persistApiKey: false,
        },
      })
    ).rejects.toThrow('Google Gemini API Key is required');
  });

  it('OcrPanel displays error message when API key is missing and button is clicked', async () => {
    saveOcrConfig({
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-1.5-flash',
      baseUrl: '',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: false,
    });

    const onUpdatePage = vi.fn();

    const { getByText, findByText } = render(
      <OcrPanel
        page={samplePage}
        layers={sampleLayers}
        onUpdatePage={onUpdatePage}
        onSelectOcrRegion={vi.fn()}
        onUpdateText={vi.fn()}
        onUpdateBBox={vi.fn()}
        onDeleteRegion={vi.fn()}
        onClearAllRegions={vi.fn()}
      />
    );

    const runBtn = getByText('Run Segmented OCR');
    expect(runBtn).toBeInTheDocument();

    fireEvent.click(runBtn);

    const errorNotice = await findByText(/Google Gemini API Key is required/i);
    expect(errorNotice).toBeInTheDocument();
  });

  it('OcrPanel triggers real OCR run and updates page when button is clicked', async () => {
    saveOcrConfig({
      provider: 'tesseract',
      apiKey: '',
      model: 'eng+ind',
      baseUrl: '',
      targetLanguage: 'auto',
      maxSegmentHeight: 1500,
      overlapHeight: 150,
      persistApiKey: false,
    });

    const onUpdatePage = vi.fn();

    const { getByText } = render(
      <OcrPanel
        page={samplePage}
        layers={sampleLayers}
        onUpdatePage={onUpdatePage}
        onSelectOcrRegion={vi.fn()}
        onUpdateText={vi.fn()}
        onUpdateBBox={vi.fn()}
        onDeleteRegion={vi.fn()}
        onClearAllRegions={vi.fn()}
      />
    );

    const runBtn = getByText('Run Segmented OCR');
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(onUpdatePage).toHaveBeenCalled();
    });
  });
});
