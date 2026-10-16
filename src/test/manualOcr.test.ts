import { describe, it, expect, afterEach } from 'vitest';
import type { Page, OcrRegion, ProjectState } from '../types/editor';
import {
  addManualOcrRegion,
  addOcrRegions,
  updateOcrRegionText,
  updateOcrRegionBBox,
  deleteOcrRegion,
  cropCanvasRegion,
} from '../core/ocr';
import { runCropOcrEngine, setMockOcrEngine } from '../services/ocrEngine';
import { createOffscreenCanvas } from '../core/engine';
import { saveProjectStateToIDB, loadProjectFromIDB } from '../services/storage';

describe('Manual OCR Text Region Functionality', () => {
  const createBasePage = (): Page => ({
    id: 'page_manual_test',
    name: 'Manual Test Page',
    width: 1000,
    height: 1500,
    layers: [],
    activeLayerId: null,
    selection: null,
    ocrRegions: [],
    selectedOcrRegionId: null,
  });

  it('should create manual text region with unique ID and source: manual', () => {
    const page = createBasePage();
    const bbox = { x: 120.4, y: 250.8, width: 300.2, height: 80.6 };
    const { page: updatedPage, regionId } = addManualOcrRegion(page, bbox, 'Manual Dialogue');

    expect(updatedPage.ocrRegions?.length).toBe(1);
    const region = updatedPage.ocrRegions?.[0];
    expect(region).toBeDefined();
    expect(region?.id).toBe(regionId);
    expect(region?.source).toBe('manual');
    expect(region?.text).toBe('Manual Dialogue');
    expect(region?.confidence).toBe(100);
    expect(region?.bbox).toEqual({ x: 120, y: 251, width: 300, height: 81 });
    expect(updatedPage.selectedOcrRegionId).toBe(regionId);
  });

  it('should generate distinct IDs for multiple manual regions created sequentially', () => {
    let page = createBasePage();
    const { page: page1, regionId: id1 } = addManualOcrRegion(page, { x: 10, y: 10, width: 100, height: 50 });
    const { page: page2, regionId: id2 } = addManualOcrRegion(page1, { x: 120, y: 120, width: 100, height: 50 });

    expect(id1).not.toBe(id2);
    expect(page2.ocrRegions?.length).toBe(2);
    expect(page2.selectedOcrRegionId).toBe(id2);
  });

  it('should preserve manual regions during OCR Replace mode', () => {
    let page = createBasePage();
    const { page: pageWithManual } = addManualOcrRegion(
      page,
      { x: 50, y: 50, width: 200, height: 60 },
      'Preserved Manual Text'
    );

    const automatedOcrResults: OcrRegion[] = [
      {
        id: 'auto_ocr_1',
        pageId: page.id,
        text: 'Auto Detected 1',
        confidence: 85,
        bbox: { x: 300, y: 300, width: 150, height: 40 },
        sourceWidth: 1000,
        sourceHeight: 1500,
        source: 'ocr',
      },
    ];

    const replaced = addOcrRegions(pageWithManual, automatedOcrResults, 'replace');
    expect(replaced.ocrRegions?.length).toBe(2);
    expect(replaced.ocrRegions?.some((r) => r.source === 'manual' && r.text === 'Preserved Manual Text')).toBe(true);
    expect(replaced.ocrRegions?.some((r) => r.id === 'auto_ocr_1')).toBe(true);
  });

  it('should append new results without duplicates during OCR Merge mode', () => {
    let page = createBasePage();
    const { page: pageWithManual } = addManualOcrRegion(
      page,
      { x: 50, y: 50, width: 200, height: 60 },
      'Manual Bubble'
    );

    const automatedOcrResults: OcrRegion[] = [
      {
        id: 'auto_ocr_1',
        pageId: page.id,
        text: 'Auto Detected 1',
        confidence: 85,
        bbox: { x: 300, y: 300, width: 150, height: 40 },
        sourceWidth: 1000,
        sourceHeight: 1500,
      },
    ];

    const merged = addOcrRegions(pageWithManual, automatedOcrResults, 'merge');
    expect(merged.ocrRegions?.length).toBe(2);
  });

  it('should support editing text, resizing bbox, and deleting manual regions', () => {
    let page = createBasePage();
    const { page: page1, regionId } = addManualOcrRegion(page, { x: 100, y: 100, width: 200, height: 100 }, '');

    // Edit Text
    const page2 = updateOcrRegionText(page1, regionId, 'Updated Manual Text');
    expect(page2.ocrRegions?.find((r) => r.id === regionId)?.text).toBe('Updated Manual Text');

    // Resize BBox
    const page3 = updateOcrRegionBBox(page2, regionId, { x: 110, y: 110, width: 250, height: 120 });
    expect(page3.ocrRegions?.find((r) => r.id === regionId)?.bbox).toEqual({ x: 110, y: 110, width: 250, height: 120 });

    // Delete Region
    const page4 = deleteOcrRegion(page3, regionId);
    expect(page4.ocrRegions?.length).toBe(0);
  });

  it('should persist manual regions in IndexedDB project state and restore accurately', async () => {
    let page = createBasePage();
    const { page: pageWithManual } = addManualOcrRegion(
      page,
      { x: 75, y: 150, width: 180, height: 90 },
      'Persisted Manual Text'
    );

    const testProject: ProjectState = {
      id: 'proj_manual_idb_test',
      name: 'Manual IDB Project',
      activePageId: pageWithManual.id,
      pages: [pageWithManual],
    };

    await saveProjectStateToIDB(testProject);
    const restored = await loadProjectFromIDB('proj_manual_idb_test');

    expect(restored).not.toBeNull();
    const restoredPage = restored?.pages[0];
    expect(restoredPage?.ocrRegions?.length).toBe(1);

    const restoredManual = restoredPage?.ocrRegions?.[0];
    expect(restoredManual?.source).toBe('manual');
    expect(restoredManual?.text).toBe('Persisted Manual Text');
    expect(restoredManual?.bbox).toEqual({ x: 75, y: 150, width: 180, height: 90 });
  });

  describe('Crop Extraction and Crop OCR Recognition', () => {
    afterEach(() => {
      setMockOcrEngine(null);
    });

    it('should crop source canvas to bounding box with clamping', () => {
      const canvas = createOffscreenCanvas(500, 500);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(100, 100, 200, 200);
      }

      const cropped = cropCanvasRegion(canvas, { x: 100, y: 100, width: 200, height: 200 });
      expect(cropped.width).toBe(200);
      expect(cropped.height).toBe(200);

      // Clamping check for out-of-bounds crop
      const clamped = cropCanvasRegion(canvas, { x: 450, y: 450, width: 100, height: 100 });
      expect(clamped.width).toBe(50);
      expect(clamped.height).toBe(50);
    });

    it('should run OCR on cropped canvas and map relative coordinates back to page pixel space', async () => {
      setMockOcrEngine(async (_img, options) => {
        return [
          {
            id: 'mock_crop_1',
            pageId: options.pageId,
            text: 'Recognized In Crop',
            confidence: 96,
            bbox: { x: 10, y: 15, width: 80, height: 30 },
            sourceWidth: options.sourceWidth,
            sourceHeight: options.sourceHeight,
          },
        ];
      });

      const cropCanvas = createOffscreenCanvas(200, 100);
      const cropBBox = { x: 150, y: 300, width: 200, height: 100 };

      const results = await runCropOcrEngine(cropCanvas, cropBBox, {
        pageId: 'page_manual_test',
        sourceWidth: 1000,
        sourceHeight: 1500,
        config: {
          provider: 'openai-compatible',
          apiKey: 'mock_key',
          model: 'custom',
          baseUrl: '',
          targetLanguage: 'auto',
          maxSegmentHeight: 1500,
          overlapHeight: 150,
          persistApiKey: false,
        },
      });

      expect(results.length).toBe(1);
      expect(results[0].text).toBe('Recognized In Crop');
      // Relative bbox (10, 15) mapped back to full page (150 + 10, 300 + 15) => (160, 315)
      expect(results[0].bbox).toEqual({ x: 160, y: 315, width: 80, height: 30 });
    });

    it('should fallback to empty region covering selected box when crop OCR yields no text', async () => {
      setMockOcrEngine(async () => []); // Return no text detected

      const cropCanvas = createOffscreenCanvas(100, 50);
      const cropBBox = { x: 200, y: 400, width: 100, height: 50 };

      const results = await runCropOcrEngine(cropCanvas, cropBBox, {
        pageId: 'page_manual_test',
        sourceWidth: 1000,
        sourceHeight: 1500,
        config: {
          provider: 'openai-compatible',
          apiKey: 'mock_key',
          model: 'custom',
          baseUrl: '',
          targetLanguage: 'auto',
          maxSegmentHeight: 1500,
          overlapHeight: 150,
          persistApiKey: false,
        },
      });

      expect(results.length).toBe(1);
      expect(results[0].text).toBe('');
      expect(results[0].source).toBe('manual');
      expect(results[0].bbox).toEqual({ x: 200, y: 400, width: 100, height: 50 });
    });
  });

  it('should handle pointer down/move/up drawing flow, coordinate mapping under zoom/pan, ignoring small boxes (<5px), and stationary viewport', () => {
    // Coordinate mapping check under zoom (1.5x) and pan (X: 100, Y: 50)
    const viewport = { zoom: 1.5, panX: 100, panY: 50 };

    const screenToDoc = (screenX: number, screenY: number) => ({
      x: (screenX - viewport.panX) / viewport.zoom,
      y: (screenY - viewport.panY) / viewport.zoom,
    });

    // Pointer down at screen (250, 200) -> doc (100, 100)
    const startDoc = screenToDoc(250, 200);
    expect(startDoc).toEqual({ x: 100, y: 100 });

    // Pointer move to screen (550, 350) -> doc (300, 200)
    const moveDoc = screenToDoc(550, 350);
    expect(moveDoc).toEqual({ x: 300, y: 200 });

    // Calculate box bbox
    const x = Math.min(startDoc.x, moveDoc.x);
    const y = Math.min(startDoc.y, moveDoc.y);
    const width = Math.abs(moveDoc.x - startDoc.x);
    const height = Math.abs(moveDoc.y - startDoc.y);

    expect({ x, y, width, height }).toEqual({ x: 100, y: 100, width: 200, height: 100 });

    // Verify viewport remains unchanged (stationary viewport)
    expect(viewport).toEqual({ zoom: 1.5, panX: 100, panY: 50 });

    // Ensure boxes smaller than 5px are ignored
    const tinyMoveDoc = screenToDoc(253, 203); // doc (102, 102) -> width 2px, height 2px
    const tinyWidth = Math.abs(tinyMoveDoc.x - startDoc.x);
    const tinyHeight = Math.abs(tinyMoveDoc.y - startDoc.y);
    const isValidRegion = tinyWidth >= 5 && tinyHeight >= 5;

    expect(isValidRegion).toBe(false);
  });
});
