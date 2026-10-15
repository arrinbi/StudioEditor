import { openDB, type IDBPDatabase } from 'idb';
import type { ProjectState, SavedProject, SavedPage } from '../types/editor';
import { serializeLayer, deserializeLayer } from '../core/engine';
import { renderPageThumbnail } from '../core/multiPage';

const DB_NAME = 'PhotoshopScanlationDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    },
  });
}

export async function saveProjectStateToIDB(project: ProjectState): Promise<void> {
  try {
    const savedPages: SavedPage[] = project.pages.map((p) => ({
      id: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      activeLayerId: p.activeLayerId,
      layers: p.layers.map(serializeLayer),
      ocrRegions: p.ocrRegions || [],
    }));

    const activeP = project.pages.find((p) => p.id === project.activePageId) || project.pages[0];

    const record: SavedProject = {
      id: project.id,
      name: project.name,
      width: activeP?.width || 1080,
      height: activeP?.height || 1620,
      updatedAt: Date.now(),
      activePageId: project.activePageId,
      pages: savedPages,
    };

    const db = await getDB();
    await db.put(STORE_PROJECTS, record);
  } catch (err) {
    console.error('Failed to save project to IndexedDB:', err);
    throw err;
  }
}

export async function loadProjectFromIDB(id: string): Promise<ProjectState | null> {
  try {
    const db = await getDB();
    const saved: SavedProject | undefined = await db.get(STORE_PROJECTS, id);
    if (!saved) return null;

    if (saved.pages && saved.pages.length > 0) {
      const pages = await Promise.all(
        saved.pages.map(async (sp) => {
          const deserializedLayers = await Promise.all(sp.layers.map((l) => deserializeLayer(l)));
          const ocrRegions = sp.ocrRegions || [];
          const pageObj = {
            id: sp.id,
            name: sp.name,
            width: sp.width,
            height: sp.height,
            activeLayerId: sp.activeLayerId,
            layers: deserializedLayers,
            selection: null,
            ocrRegions,
            selectedOcrRegionId: ocrRegions.length > 0 ? ocrRegions[0].id : null,
          };
          const thumbnailDataUrl = renderPageThumbnail(pageObj);
          return {
            ...pageObj,
            thumbnailDataUrl,
          };
        })
      );

      const activePageId = saved.activePageId && pages.some((p) => p.id === saved.activePageId)
        ? saved.activePageId
        : pages[0].id;

      return {
        id: saved.id,
        name: saved.name,
        activePageId,
        pages,
      };
    }

    // Backward compatibility for single-page SavedProject
    return null;
  } catch (err) {
    console.error('Failed to load project from IndexedDB:', err);
    return null;
  }
}

export async function saveProjectToIDB(project: SavedProject): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_PROJECTS, project);
  } catch (err) {
    console.error('Failed to save project to IndexedDB:', err);
  }
}

export async function getProjectsFromIDB(): Promise<SavedProject[]> {
  try {
    const db = await getDB();
    return await db.getAll(STORE_PROJECTS);
  } catch (err) {
    console.error('Failed to read projects from IndexedDB:', err);
    return [];
  }
}

export async function deleteProjectFromIDB(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_PROJECTS, id);
  } catch (err) {
    console.error('Failed to delete project from IndexedDB:', err);
  }
}
