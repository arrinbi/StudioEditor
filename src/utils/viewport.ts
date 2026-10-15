export function screenToDocCoordinates(
  pointerX: number,
  pointerY: number,
  panX: number,
  panY: number,
  zoom: number
): { x: number; y: number } {
  return {
    x: (pointerX - panX) / zoom,
    y: (pointerY - panY) / zoom,
  };
}

export function calculateFitToScreenViewport(
  containerWidth: number,
  containerHeight: number,
  docWidth: number,
  docHeight: number,
  padding: number = 40
): { zoom: number; panX: number; panY: number } {
  const availW = Math.max(10, containerWidth - padding * 2);
  const availH = Math.max(10, containerHeight - padding * 2);
  const scaleW = availW / docWidth;
  const scaleH = availH / docHeight;
  const zoom = Math.min(scaleW, scaleH);

  const panX = (containerWidth - docWidth * zoom) / 2;
  const panY = (containerHeight - docHeight * zoom) / 2;

  return { zoom, panX, panY };
}

export interface ScrollBounds {
  minPanX: number;
  maxPanX: number;
  minPanY: number;
  maxPanY: number;
  isXScrollable: boolean;
  isYScrollable: boolean;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateScrollBounds(
  viewportWidth: number,
  viewportHeight: number,
  docWidth: number,
  docHeight: number,
  zoom: number,
  padding: number = 40
): ScrollBounds {
  const scaledW = docWidth * zoom;
  const scaledH = docHeight * zoom;

  let minPanX: number;
  let maxPanX: number;
  let isXScrollable = false;

  if (scaledW + padding * 2 <= viewportWidth) {
    minPanX = (viewportWidth - scaledW) / 2;
    maxPanX = minPanX;
    isXScrollable = false;
  } else {
    minPanX = viewportWidth - scaledW - padding;
    maxPanX = padding;
    isXScrollable = true;
  }

  let minPanY: number;
  let maxPanY: number;
  let isYScrollable = false;

  if (scaledH + padding * 2 <= viewportHeight) {
    minPanY = (viewportHeight - scaledH) / 2;
    maxPanY = minPanY;
    isYScrollable = false;
  } else {
    minPanY = viewportHeight - scaledH - padding;
    maxPanY = padding;
    isYScrollable = true;
  }

  return {
    minPanX,
    maxPanX,
    minPanY,
    maxPanY,
    isXScrollable,
    isYScrollable,
  };
}

export function panToScrollRatio(pan: number, minPan: number, maxPan: number): number {
  if (maxPan <= minPan) return 0;
  return clamp((maxPan - pan) / (maxPan - minPan), 0, 1);
}

export function scrollRatioToPan(ratio: number, minPan: number, maxPan: number): number {
  if (maxPan <= minPan) return minPan;
  const clampedRatio = clamp(ratio, 0, 1);
  return maxPan - clampedRatio * (maxPan - minPan);
}

export function calculateThumbSize(
  viewportSize: number,
  contentScaledSize: number,
  trackSize: number,
  padding: number = 40,
  minThumbSize: number = 24
): number {
  const totalVirtualSize = contentScaledSize + padding * 2;
  if (totalVirtualSize <= viewportSize || trackSize <= 0) {
    return trackSize;
  }
  const ratio = Math.min(1, viewportSize / totalVirtualSize);
  return Math.max(minThumbSize, Math.round(trackSize * ratio));
}
