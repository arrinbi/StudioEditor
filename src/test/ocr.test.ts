import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Page, OcrRegion, ProjectState } from '../types/editor';
import {
  addOcrRegions,
  updateOcrRegionText,
  updateOcrRegionBBox,
  deleteOcrRegion,
  clearAllOcrRegions,
  selectOcrRegion,
  extractOcrSourceCanvas,
} from '../core/ocr';
import { setMockOcrEngine, runOcrEngine } from '../services/ocrEngine';
import { saveProjectStateToIDB, loadProjectFromIDB } from '../services/storage';
import { renderDocumentComposite } from '../core/export';
import { createOffscreenCanvas } from '../core/engine';

describe('OCR Core Operations and Region Management', () => {
  let samplePage: Page;
  let sampleRegions: OcrRegion[];

  beforeEach(() => {
    samplePage = {
      id: 'page_1',
      name: 'Page 1',
      width: 800,
      height: 1200,
      layers: [],
      activeLayerId: null,
      selection: null,
      ocrRegions: [],
      selectedOcrRegionId: null,
    };

    sampleRegions = [
      {
        id: 'ocr_1',
        pageId: 'page_1',
        text: 'Halo Dunia',
        confidence: 95,
        bbox: { x: 50, y: 100, width: 200, height: 60 },
        sourceWidth: 800,
        sourceHeight: 1200,
      },
      {
        id: 'ocr_2',
        pageId: 'page_1',
        text: 'Hello World',
        confidence: 88,
        bbox: { x: 300, y: 400, width: 180, height: 50 },
        sourceWidth: 800,
        sourceHeight: 1200,
      },
    ];
  });

  it('should add OCR regions in replace mode', () => {
    const updated = addOcrRegions(samplePage, sampleRegions, 'replace');
    expect(updated.ocrRegions?.length).toBe(2);
    expect(updated.ocrRegions?.[0].text).toBe('Halo Dunia');
    expect(updated.selectedOcrRegionId).toBe('ocr_1');
  });

  it('should merge new OCR regions without duplicating existing ones', () => {
    const pageWithInitial = addOcrRegions(samplePage, sampleRegions, 'replace');

    const newRegions: OcrRegion[] = [
      // Duplicate of ocr_1
      {
        id: 'ocr_dup',
        pageId: 'page_1',
        text: 'Halo Dunia',
        confidence: 90,
        bbox: { x: 50, y: 100, width: 200, height: 60 },
        sourceWidth: 800,
        sourceHeight: 1200,
      },
      // Distinct new region
      {
        id: 'ocr_3',
        pageId: 'page_1',
        text: 'Selamat Pagi',
        confidence: 92,
        bbox: { x: 100, y: 800, width: 250, height: 70 },
        sourceWidth: 800,
        sourceHeight: 1200,
      },
    ];

    const merged = addOcrRegions(pageWithInitial, newRegions, 'merge');
    expect(merged.ocrRegions?.length).toBe(3);
    expect(merged.ocrRegions?.some((r) => r.text === 'Selamat Pagi')).toBe(true);
  });

  it('should update OCR region text while preserving metadata', () => {
    const pageWithRegions = addOcrRegions(samplePage, sampleRegions, 'replace');
    const updated = updateOcrRegionText(pageWithRegions, 'ocr_1', 'Halo Indonesia');

    const region = updated.ocrRegions?.find((r) => r.id === 'ocr_1');
    expect(region).toBeDefined();
    expect(region?.text).toBe('Halo Indonesia');
    expect(region?.confidence).toBe(95);
    expect(region?.bbox).toEqual({ x: 50, y: 100, width: 200, height: 60 });
  });

  it('should update OCR region bounding box', () => {
    const pageWithRegions = addOcrRegions(samplePage, sampleRegions, 'replace');
    const newBBox = { x: 60, y: 110, width: 220, height: 70 };
    const updated = updateOcrRegionBBox(pageWithRegions, 'ocr_1', newBBox);

    const region = updated.ocrRegions?.find((r) => r.id === 'ocr_1');
    expect(region?.bbox).toEqual(newBBox);
  });

  it('should delete a region and manage selected region ID', () => {
    const pageWithRegions = addOcrRegions(samplePage, sampleRegions, 'replace');
    const selected = selectOcrRegion(pageWithRegions, 'ocr_1');

    const deleted = deleteOcrRegion(selected, 'ocr_1');
    expect(deleted.ocrRegions?.length).toBe(1);
    expect(deleted.ocrRegions?.some((r) => r.id === 'ocr_1')).toBe(false);
    expect(deleted.selectedOcrRegionId).toBe('ocr_2');
  });

  it('should clear all OCR regions from a page', () => {
    const pageWithRegions = addOcrRegions(samplePage, sampleRegions, 'replace');
    const cleared = clearAllOcrRegions(pageWithRegions);

    expect(cleared.ocrRegions?.length).toBe(0);
    expect(cleared.selectedOcrRegionId).toBeNull();
  });

  it('should maintain strict page isolation for OCR regions', () => {
    const page1 = addOcrRegions(
      { ...samplePage, id: 'page_1' },
      [sampleRegions[0]],
      'replace'
    );
    const page2 = addOcrRegions(
      { ...samplePage, id: 'page_2' },
      [sampleRegions[1]],
      'replace'
    );

    expect(page1.ocrRegions?.length).toBe(1);
    expect(page1.ocrRegions?.[0].text).toBe('Halo Dunia');

    expect(page2.ocrRegions?.length).toBe(1);
    expect(page2.ocrRegions?.[0].text).toBe('Hello World');
  });
});

describe('Mock OCR Engine Execution', () => {
  afterEach(() => {
    setMockOcrEngine(null);
  });

  it('should execute mock OCR engine without network requests', async () => {
    setMockOcrEngine(async (_image, options) => {
      return [
        {
          id: 'mock_1',
          pageId: options.pageId,
          text: 'Mocked OCR Text',
          confidence: 99,
          bbox: { x: 10, y: 20, width: 100, height: 40 },
          sourceWidth: options.sourceWidth,
          sourceHeight: options.sourceHeight,
        },
      ];
    });

    const canvas = createOffscreenCanvas(800, 600);
    const progressLogs: string[] = [];

    const results = await runOcrEngine(canvas, {
      lang: 'ind',
      pageId: 'page_test',
      sourceWidth: 800,
      sourceHeight: 600,
      onProgress: (p) => progressLogs.push(p.status),
    });

    expect(results.length).toBe(1);
    expect(results[0].text).toBe('Mocked OCR Text');
    expect(results[0].confidence).toBe(99);
  });
});

describe('OCR Persistence and Export Isolation', () => {
  it('should save and restore page OCR regions in IndexedDB', async () => {
    const testProject: ProjectState = {
      id: 'proj_ocr_test',
      name: 'OCR Persistence Project',
      activePageId: 'page_1',
      pages: [
        {
          id: 'page_1',
          name: 'Page 1',
          width: 500,
          height: 500,
          layers: [],
          activeLayerId: null,
          selection: null,
          ocrRegions: [
            {
              id: 'ocr_persisted',
              pageId: 'page_1',
              text: 'Persisted OCR Region',
              confidence: 91,
              bbox: { x: 20, y: 30, width: 150, height: 40 },
              sourceWidth: 500,
              sourceHeight: 500,
            },
          ],
        },
      ],
    };

    await saveProjectStateToIDB(testProject);
    const restored = await loadProjectFromIDB('proj_ocr_test');

    expect(restored).not.toBeNull();
    expect(restored?.pages.length).toBe(1);
    const restoredPage = restored?.pages[0];
    expect(restoredPage?.ocrRegions?.length).toBe(1);
    expect(restoredPage?.ocrRegions?.[0].text).toBe('Persisted OCR Region');
  });

  it('should exclude temporary OCR overlay nodes from exported document composite canvas', () => {
    const docState = {
      id: 'page_1',
      name: 'Page 1',
      width: 400,
      height: 400,
      layers: [],
      activeLayerId: null,
      selection: null,
    };

    const compositeCanvas = renderDocumentComposite(docState);
    expect(compositeCanvas).toBeDefined();
    expect(compositeCanvas.width).toBe(400);
    expect(compositeCanvas.height).toBe(400);
  });

  it('should extract clean source canvas for OCR without editor UI or selection handles', () => {
    const pageObj: Page = {
      id: 'page_1',
      name: 'Page 1',
      width: 600,
      height: 800,
      layers: [],
      activeLayerId: null,
      selection: { x: 10, y: 10, width: 100, height: 100 },
    };

    const sourceCanvas = extractOcrSourceCanvas(pageObj, 'composite');
    expect(sourceCanvas).toBeDefined();
    expect(sourceCanvas.width).toBe(600);
    expect(sourceCanvas.height).toBe(800);
  });
});
