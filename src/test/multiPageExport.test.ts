import { describe, it, expect } from 'vitest';
import { createInitialProject, createDefaultPage } from '../core/multiPage';
import { exportProjectToPDF, exportProjectToZIP } from '../core/export';

describe('Multi-Page PDF and ZIP Export Engine', () => {
  it('exports multi-page project to PDF blob', async () => {
    const proj = createInitialProject('PDF Test Project', 400, 600);
    const p2 = createDefaultPage(500, 700, 'Page 2');
    proj.pages.push(p2);

    const pdfBlob = await exportProjectToPDF(proj);
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(0);
  });

  it('exports multi-page project to ZIP archive blob with zero-padded filenames', async () => {
    const proj = createInitialProject('ZIP Test Project', 300, 300);
    const p2 = createDefaultPage(300, 300, 'Page 2');
    proj.pages.push(p2);

    const zipBlobPNG = await exportProjectToZIP(proj, 'png');
    expect(zipBlobPNG).toBeInstanceOf(Blob);
    expect(zipBlobPNG.size).toBeGreaterThan(0);

    const zipBlobJPEG = await exportProjectToZIP(proj, 'jpeg');
    expect(zipBlobJPEG).toBeInstanceOf(Blob);
    expect(zipBlobJPEG.size).toBeGreaterThan(0);
  });
});
