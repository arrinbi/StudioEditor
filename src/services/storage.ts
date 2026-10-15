import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'PhotoshopScanlationDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';

export interface SavedProject {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: number;
  dataUrl?: string;
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    },
  });
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
