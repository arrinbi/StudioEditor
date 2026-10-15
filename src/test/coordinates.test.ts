import { describe, it, expect } from 'vitest';
import { screenToDocCoordinates, calculateFitToScreenViewport } from '../utils/viewport';

describe('Canvas Viewport & Coordinate Math', () => {
  it('converts screen coordinates to document pixels accurately', () => {
    const coords = screenToDocCoordinates(200, 250, 100, 50, 1.0);
    expect(coords.x).toBe(100);
    expect(coords.y).toBe(200);

    const zoomedCoords = screenToDocCoordinates(250, 250, 50, 50, 2.0);
    expect(zoomedCoords.x).toBe(100);
    expect(zoomedCoords.y).toBe(100);
  });

  it('calculates perfect center-fit viewport on screen', () => {
    const fit = calculateFitToScreenViewport(1000, 800, 800, 600, 50);
    expect(fit.zoom).toBeGreaterThan(0);
    expect(fit.panX).toBeGreaterThan(0);
    expect(fit.panY).toBeGreaterThan(0);

    const docCenterXOnScreen = fit.panX + (800 * fit.zoom) / 2;
    expect(docCenterXOnScreen).toBeCloseTo(500);
  });
});
