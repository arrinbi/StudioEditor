import { describe, it, expect } from 'vitest';
import {
  createDefaultPage,
  createInitialProject,
  duplicatePage,
  reorderPages,
  renderPageThumbnail,
} from '../core/multiPage';
import { saveProjectStateToIDB, loadProjectFromIDB } from '../services/storage';

describe('Multi-Page Document Engine', () => {
  it('creates default page and initial project', () => {
    const page = createDefaultPage(800, 1200, 'Test Page');
    expect(page.id).toBeDefined();
    expect(page.name).toBe('Test Page');
    expect(page.width).toBe(800);
    expect(page.height).toBe(1200);
    expect(page.layers.length).toBe(1);

    const proj = createInitialProject('Manga Project', 1000, 1500);
    expect(proj.name).toBe('Manga Project');
    expect(proj.pages.length).toBe(1);
    expect(proj.activePageId).toBe(proj.pages[0].id);
  });

  it('duplicates page cleanly without mutating original', () => {
    const page = createDefaultPage(1080, 1620, 'Original Page');
    const dup = duplicatePage(page);

    expect(dup.id).not.toBe(page.id);
    expect(dup.name).toBe('Original Page Copy');
    expect(dup.width).toBe(page.width);
    expect(dup.height).toBe(page.height);
    expect(dup.layers.length).toBe(page.layers.length);
    expect(dup.layers[0].id).not.toBe(page.layers[0].id);
  });

  it('reorders pages correctly', () => {
    const p1 = createDefaultPage(100, 100, 'P1');
    const p2 = createDefaultPage(100, 100, 'P2');
    const p3 = createDefaultPage(100, 100, 'P3');
    const pages = [p1, p2, p3];

    const reordered = reorderPages(pages, 0, 2);
    expect(reordered[0].name).toBe('P2');
    expect(reordered[1].name).toBe('P3');
    expect(reordered[2].name).toBe('P1');
  });

  it('generates page thumbnail data URL', () => {
    const page = createDefaultPage(400, 600, 'Thumb Page');
    const thumbUrl = renderPageThumbnail(page, 100);
    expect(thumbUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('saves and loads multi-page project to IndexedDB persistence', async () => {
    const proj = createInitialProject('Persist Proj', 500, 500);
    const p2 = createDefaultPage(600, 800, 'Page Two');
    proj.pages.push(p2);
    proj.activePageId = p2.id;

    await saveProjectStateToIDB(proj);
    const restored = await loadProjectFromIDB(proj.id);

    expect(restored).not.toBeNull();
    if (restored) {
      expect(restored.id).toBe(proj.id);
      expect(restored.name).toBe('Persist Proj');
      expect(restored.pages.length).toBe(2);
      expect(restored.activePageId).toBe(p2.id);
      expect(restored.pages[1].width).toBe(600);
      expect(restored.pages[1].height).toBe(800);
    }
  });
});
