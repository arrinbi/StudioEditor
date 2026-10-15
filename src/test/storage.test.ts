import { describe, it, expect } from 'vitest';
import { saveProjectToIDB, getProjectsFromIDB } from '../services/storage';

describe('IndexedDB storage service', () => {
  it('should save and retrieve project', async () => {
    const testProject = {
      id: 'test-1',
      name: 'Test Document',
      width: 800,
      height: 600,
      updatedAt: Date.now(),
    };
    await saveProjectToIDB(testProject);
    const projects = await getProjectsFromIDB();
    expect(projects.length).toBeGreaterThanOrEqual(1);
    const saved = projects.find((p) => p.id === 'test-1');
    expect(saved).toBeDefined();
    expect(saved?.name).toBe('Test Document');
  });
});
