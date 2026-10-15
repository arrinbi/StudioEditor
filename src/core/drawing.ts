import type { RasterLayer, ToolSettings } from '../types/editor';

interface Point {
  x: number;
  y: number;
}

export function drawRasterStroke(
  layer: RasterLayer,
  from: Point,
  to: Point,
  settings: ToolSettings,
  isEraser: boolean = false
) {
  if (layer.locked || !layer.visible) return;

  const ctx = layer.canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();

  const p1 = { x: from.x - layer.x, y: from.y - layer.y };
  const p2 = { x: to.x - layer.x, y: to.y - layer.y };

  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = settings.eraserSize;
    ctx.globalAlpha = settings.eraserOpacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = settings.brushColor;
    ctx.lineWidth = settings.brushSize;
    ctx.globalAlpha = settings.brushOpacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (settings.brushHardness < 0.95) {
      const shadowBlur = settings.brushSize * (1 - settings.brushHardness) * 0.5;
      ctx.shadowColor = settings.brushColor;
      ctx.shadowBlur = shadowBlur;
    }

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  ctx.restore();
}
