import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import type { DocumentState, ViewportState, ToolType } from '../types/editor';

interface CanvasAreaProps {
  document: DocumentState;
  viewport: ViewportState;
  activeTool: ToolType;
  onViewportChange: (newViewport: ViewportState) => void;
  onCursorMove: (pos: { x: number; y: number } | null) => void;
  onCanvasPointerDown: (docX: number, docY: number, evt: Konva.KonvaEventObject<PointerEvent>) => void;
  onCanvasPointerMove: (docX: number, docY: number, evt: Konva.KonvaEventObject<PointerEvent>) => void;
  onCanvasPointerUp: (docX: number, docY: number, evt: Konva.KonvaEventObject<PointerEvent>) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  document,
  viewport,
  activeTool,
  onViewportChange,
  onCursorMove,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const isDraggingHandRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getDocCoordinates = (stage: Konva.Stage): { x: number; y: number } | null => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    const docX = (pointer.x - viewport.panX) / viewport.zoom;
    const docY = (pointer.y - viewport.panY) / viewport.zoom;
    return { x: docX, y: docY };
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    const oldZoom = viewport.zoom;
    let newZoom = e.evt.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
    newZoom = Math.max(0.05, Math.min(20, newZoom));

    const mousePointTo = {
      x: (pointer.x - viewport.panX) / oldZoom,
      y: (pointer.y - viewport.panY) / oldZoom,
    };

    const newPanX = pointer.x - mousePointTo.x * newZoom;
    const newPanY = pointer.y - mousePointTo.y * newZoom;

    onViewportChange({
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY,
    });
  };

  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (activeTool === 'hand' || e.evt.button === 1) {
      isDraggingHandRef.current = true;
      lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (activeTool === 'zoom') {
      const zoomFactor = e.evt.shiftKey ? 0.7 : 1.4;
      const newZoom = Math.max(0.05, Math.min(20, viewport.zoom * zoomFactor));
      const pointer = stage.getPointerPosition();
      if (pointer) {
        const mousePointTo = {
          x: (pointer.x - viewport.panX) / viewport.zoom,
          y: (pointer.y - viewport.panY) / viewport.zoom,
        };
        onViewportChange({
          zoom: newZoom,
          panX: pointer.x - mousePointTo.x * newZoom,
          panY: pointer.y - mousePointTo.y * newZoom,
        });
      }
      return;
    }

    const docPos = getDocCoordinates(stage);
    if (docPos) {
      onCanvasPointerDown(docPos.x, docPos.y, e);
    }
  };

  const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (isDraggingHandRef.current && lastPanPosRef.current) {
      const dx = e.evt.clientX - lastPanPosRef.current.x;
      const dy = e.evt.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };

      onViewportChange({
        ...viewport,
        panX: viewport.panX + dx,
        panY: viewport.panY + dy,
      });
      return;
    }

    const docPos = getDocCoordinates(stage);
    if (docPos) {
      onCursorMove(docPos);
      onCanvasPointerMove(docPos.x, docPos.y, e);
    }
  };

  const handlePointerUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (isDraggingHandRef.current) {
      isDraggingHandRef.current = false;
      lastPanPosRef.current = null;
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;

    const docPos = getDocCoordinates(stage);
    if (docPos) {
      onCanvasPointerUp(docPos.x, docPos.y, e);
    }
  };

  const handlePointerLeave = () => {
    onCursorMove(null);
    isDraggingHandRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-zinc-950 relative overflow-hidden select-none touch-none cursor-crosshair"
      style={{
        cursor:
          activeTool === 'hand'
            ? isDraggingHandRef.current
              ? 'grabbing'
              : 'grab'
            : activeTool === 'zoom'
            ? 'zoom-in'
            : 'crosshair',
      }}
    >
      <Stage
        width={containerSize.width}
        height={containerSize.height}
        x={viewport.panX}
        y={viewport.panY}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <Layer>
          <Rect
            x={2}
            y={2}
            width={document.width}
            height={document.height}
            fill="#000000"
            opacity={0.4}
            shadowBlur={10}
          />
          <Rect
            x={0}
            y={0}
            width={document.width}
            height={document.height}
            fill="#ffffff"
          />
        </Layer>

        <Layer>
          {document.layers.map((layer) => {
            if (!layer.visible) return null;

            if (layer.type === 'raster' || layer.type === 'mask') {
              return (
                <KonvaImage
                  key={layer.id}
                  x={layer.x}
                  y={layer.y}
                  image={layer.canvas}
                  opacity={layer.opacity}
                />
              );
            }

            if (layer.type === 'image') {
              return (
                <KonvaImage
                  key={layer.id}
                  x={layer.x}
                  y={layer.y}
                  image={layer.image}
                  width={layer.width}
                  height={layer.height}
                  opacity={layer.opacity}
                />
              );
            }

            return null;
          })}
        </Layer>

        {document.selection && (
          <Layer>
            <Rect
              x={document.selection.x}
              y={document.selection.y}
              width={document.selection.width}
              height={document.selection.height}
              stroke="#0099ff"
              strokeWidth={1 / viewport.zoom}
              dash={[4 / viewport.zoom, 4 / viewport.zoom]}
              listening={false}
            />
          </Layer>
        )}
      </Stage>
    </div>
  );
};
