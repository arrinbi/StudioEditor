import { describe, it, expect } from 'vitest';
import {
  screenToDocCoordinates,
  calculateFitToScreenViewport,
  calculateScrollBounds,
  panToScrollRatio,
  scrollRatioToPan,
  calculateThumbSize,
} from '../utils/viewport';

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

  it('calculates scroll bounds accurately when zoomed in and zoomed out', () => {
    // Zoomed in: 1000px doc at 2.0x scale = 2000px in an 800px viewport
    const boundsZoomedIn = calculateScrollBounds(800, 600, 1000, 1000, 2.0, 40);
    expect(boundsZoomedIn.isXScrollable).toBe(true);
    expect(boundsZoomedIn.isYScrollable).toBe(true);
    expect(boundsZoomedIn.maxPanX).toBe(40);
    expect(boundsZoomedIn.minPanX).toBe(800 - 2000 - 40); // -1240
    expect(boundsZoomedIn.maxPanY).toBe(40);
    expect(boundsZoomedIn.minPanY).toBe(600 - 2000 - 40); // -1440

    // Zoomed out: 500px doc at 0.5x scale = 250px in an 800px viewport
    const boundsZoomedOut = calculateScrollBounds(800, 600, 500, 500, 0.5, 40);
    expect(boundsZoomedOut.isXScrollable).toBe(false);
    expect(boundsZoomedOut.isYScrollable).toBe(false);
    expect(boundsZoomedOut.minPanX).toBe((800 - 250) / 2); // 275
    expect(boundsZoomedOut.maxPanX).toBe((800 - 250) / 2);
  });

  it('converts pan position to scroll ratio and back seamlessly', () => {
    const minPan = -1000;
    const maxPan = 100;

    // At top/left (maxPan)
    expect(panToScrollRatio(maxPan, minPan, maxPan)).toBe(0);
    expect(scrollRatioToPan(0, minPan, maxPan)).toBe(maxPan);

    // At bottom/right (minPan)
    expect(panToScrollRatio(minPan, minPan, maxPan)).toBe(1);
    expect(scrollRatioToPan(1, minPan, maxPan)).toBe(minPan);

    // Midpoint
    const midPan = (minPan + maxPan) / 2;
    expect(panToScrollRatio(midPan, minPan, maxPan)).toBe(0.5);
    expect(scrollRatioToPan(0.5, minPan, maxPan)).toBe(midPan);
  });

  it('calculates scrollbar thumb sizes with minimum threshold', () => {
    // Content fits in viewport -> full track
    const fullSize = calculateThumbSize(800, 400, 800, 40, 24);
    expect(fullSize).toBe(800);

    // Large content -> proportional thumb
    const proportional = calculateThumbSize(800, 1600, 800, 40, 24);
    expect(proportional).toBeLessThan(800);
    expect(proportional).toBeGreaterThan(24);

    // Huge content -> clamped to min thumb size
    const clampedMin = calculateThumbSize(800, 100000, 800, 40, 24);
    expect(clampedMin).toBe(24);
  });
});
