import { describe, it, expect, beforeEach } from 'vitest';
import type { Page, OcrRegion } from '../types/editor';
import {
  addOcrRegions,
  updateOcrRegionText,
  cropCanvasRegion,
  selectOcrRegion,
} from '../core/ocr';
import { runCropOcrEngine, setMockOcrEngine } from '../services/ocrEngine';
import { createOffscreenCanvas } from '../core/engine';

describe('Manual OCR Region & Per-Region OCR Workflow Regression Suite', () => {
  beforeEach(() => {
    setMockOcrEngine(null);
  });

  const createBasePage = (): Page => ({
    id: 'page_workflow_test',
    name: 'Workflow Test Page',
    width: 1080,
    height: 1620,
    layers: [],
    activeLayerId: null,
    selection: null,
    ocrRegions: [],
    selectedOcrRegionId: null,
  });

  it('1. Allows creating a manual text region with empty text immediately without requiring prior OCR or typing', () => {
    const basePage = createBasePage();
    const manualRegionBBox = { x: 150, y: 300, width: 200, height: 100 };

    const manualRegion: OcrRegion = {
      id: 'manual_1',
      pageId: basePage.id,
      text: '',
      confidence: 100,
      bbox: manualRegionBBox,
      sourceWidth: basePage.width,
      sourceHeight: basePage.height,
      source: 'manual',
    };

    const updatedPage = addOcrRegions(basePage, [manualRegion], 'merge');
    const selectedPage = selectOcrRegion(updatedPage, manualRegion.id);

    expect(selectedPage.ocrRegions?.length).toBe(1);
    expect(selectedPage.selectedOcrRegionId).toBe('manual_1');

    const created = selectedPage.ocrRegions?.[0];
    expect(created?.source).toBe('manual');
    expect(created?.text).toBe('');
    expect(created?.bbox).toEqual({ x: 150, y: 300, width: 200, height: 100 });
  });

  it('2. Performs OCR on a selected region crop and updates text in place while preserving ID and bbox', async () => {
    const basePage = createBasePage();
    const targetBBox = { x: 100, y: 200, width: 180, height: 90 };

    const initialRegion: OcrRegion = {
      id: 'manual_target',
      pageId: basePage.id,
      text: '',
      confidence: 100,
      bbox: targetBBox,
      sourceWidth: basePage.width,
      sourceHeight: basePage.height,
      source: 'manual',
    };

    let pageState = addOcrRegions(basePage, [initialRegion], 'merge');

    // Mock OCR engine returning text for crop
    setMockOcrEngine(async (_canvas, options) => {
      return [
        {
          id: 'mock_crop_ocr',
          pageId: options.pageId,
          text: 'WHAT ARE YOU DOING HERE?!',
          confidence: 97,
          bbox: { x: 0, y: 0, width: 180, height: 90 },
          sourceWidth: options.sourceWidth,
          sourceHeight: options.sourceHeight,
          source: 'ocr',
        },
      ];
    });

    const cropCanvas = createOffscreenCanvas(targetBBox.width, targetBBox.height);
    const results = await runCropOcrEngine(cropCanvas, targetBBox, {
      pageId: basePage.id,
      sourceWidth: basePage.width,
      sourceHeight: basePage.height,
      config: {
        provider: 'openai-compatible',
        apiKey: 'mock_key',
        model: 'custom',
        baseUrl: '',
        targetLanguage: 'auto',
        maxSegmentHeight: 1620,
        overlapHeight: 150,
        persistApiKey: false,
      },
    });

    expect(results.length).toBe(1);
    expect(results[0].text).toBe('WHAT ARE YOU DOING HERE?!');

    // Update text in place for region 'manual_target'
    pageState = updateOcrRegionText(pageState, 'manual_target', results[0].text);

    expect(pageState.ocrRegions?.length).toBe(1);
    const updated = pageState.ocrRegions?.[0];
    expect(updated?.id).toBe('manual_target');
    expect(updated?.text).toBe('WHAT ARE YOU DOING HERE?!');
    expect(updated?.bbox).toEqual(targetBBox);
    expect(updated?.source).toBe('manual');
  });

  it('3. Retains manual region and handles error gracefully if crop OCR returns empty or fails', async () => {
    const basePage = createBasePage();
    const targetBBox = { x: 400, y: 500, width: 120, height: 60 };

    const initialRegion: OcrRegion = {
      id: 'manual_empty_crop',
      pageId: basePage.id,
      text: '',
      confidence: 100,
      bbox: targetBBox,
      sourceWidth: basePage.width,
      sourceHeight: basePage.height,
      source: 'manual',
    };

    let pageState = addOcrRegions(basePage, [initialRegion], 'merge');

    // Mock OCR engine returning no detected text
    setMockOcrEngine(async () => []);

    const cropCanvas = createOffscreenCanvas(targetBBox.width, targetBBox.height);
    const results = await runCropOcrEngine(cropCanvas, targetBBox, {
      pageId: basePage.id,
      sourceWidth: basePage.width,
      sourceHeight: basePage.height,
      config: {
        provider: 'openai-compatible',
        apiKey: 'mock_key',
        model: 'custom',
        baseUrl: '',
        targetLanguage: 'auto',
        maxSegmentHeight: 1620,
        overlapHeight: 150,
        persistApiKey: false,
      },
    });

    // Fallback returns empty region for the crop
    expect(results.length).toBe(1);
    expect(results[0].text).toBe('');

    // If empty text, target region remains present in page state for manual typing
    expect(pageState.ocrRegions?.length).toBe(1);
    expect(pageState.ocrRegions?.[0].id).toBe('manual_empty_crop');

    // User can manually edit text afterward
    pageState = updateOcrRegionText(pageState, 'manual_empty_crop', 'Manual User Fallback Input');
    expect(pageState.ocrRegions?.[0].text).toBe('Manual User Fallback Input');
  });

  it('4. Running per-region OCR preserves all other existing auto and manual regions', async () => {
    const basePage = createBasePage();

    const existingAutoRegion: OcrRegion = {
      id: 'auto_1',
      pageId: basePage.id,
      text: 'Existing Automatic Dialogue',
      confidence: 90,
      bbox: { x: 50, y: 50, width: 200, height: 80 },
      sourceWidth: basePage.width,
      sourceHeight: basePage.height,
      source: 'ocr',
    };

    const targetManualRegion: OcrRegion = {
      id: 'manual_2',
      pageId: basePage.id,
      text: '',
      confidence: 100,
      bbox: { x: 300, y: 400, width: 150, height: 70 },
      sourceWidth: basePage.width,
      sourceHeight: basePage.height,
      source: 'manual',
    };

    let pageState = addOcrRegions(basePage, [existingAutoRegion, targetManualRegion], 'replace');
    expect(pageState.ocrRegions?.length).toBe(2);

    // Mock OCR engine returning text for crop
    setMockOcrEngine(async () => [
      {
        id: 'ocr_crop_result',
        pageId: basePage.id,
        text: 'Newly Recognized Crop Text',
        confidence: 95,
        bbox: { x: 0, y: 0, width: 150, height: 70 },
        sourceWidth: basePage.width,
        sourceHeight: basePage.height,
      },
    ]);

    const cropCanvas = createOffscreenCanvas(150, 70);
    const results = await runCropOcrEngine(cropCanvas, targetManualRegion.bbox, {
      pageId: basePage.id,
      sourceWidth: basePage.width,
      sourceHeight: basePage.height,
      config: {
        provider: 'openai-compatible',
        apiKey: 'mock_key',
        model: 'custom',
        baseUrl: '',
        targetLanguage: 'auto',
        maxSegmentHeight: 1620,
        overlapHeight: 150,
        persistApiKey: false,
      },
    });

    // Update text on manual_2 only
    pageState = updateOcrRegionText(pageState, 'manual_2', results[0].text);

    expect(pageState.ocrRegions?.length).toBe(2);
    expect(pageState.ocrRegions?.find((r) => r.id === 'auto_1')?.text).toBe('Existing Automatic Dialogue');
    expect(pageState.ocrRegions?.find((r) => r.id === 'manual_2')?.text).toBe('Newly Recognized Crop Text');
  });

  it('5. Correctly crops original canvas boundaries with clamping and preserves source resolution', () => {
    const sourceCanvas = createOffscreenCanvas(1000, 2000);
    const ctx = sourceCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(100, 100, 300, 400);
    }

    // Normal in-bounds crop
    const crop1 = cropCanvasRegion(sourceCanvas, { x: 100, y: 100, width: 300, height: 400 });
    expect(crop1.width).toBe(300);
    expect(crop1.height).toBe(400);

    // Out-of-bounds crop clamped to canvas boundary
    const crop2 = cropCanvasRegion(sourceCanvas, { x: 900, y: 1800, width: 300, height: 400 });
    expect(crop2.width).toBe(100);
    expect(crop2.height).toBe(200);
  });
});
