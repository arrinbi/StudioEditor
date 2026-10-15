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
