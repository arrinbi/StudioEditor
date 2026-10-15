import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text as KonvaText, Transformer } from 'react-konva';
import Konva from 'konva';
import type { DocumentState, ViewportState, ToolType, TextLayer } from '../types/editor';

interface CanvasAreaProps {
  document: DocumentState;
  viewport: ViewportState;
  activeTool: ToolType;
  onViewportChange: (newViewport: ViewportState) => void;
  onCursorMove: (pos: { x: number; y: number } | null) => void;
  onCanvasPointerDown: (docX: number, docY: number, evt: Konva.KonvaEventObject<PointerEvent>) => void;
  onCanvasPointerMove: (docX: number, docY: number, evt: Konva.KonvaEventObject<PointerEvent>) => void;
  onCanvasPointerUp: (docX: number, docY: number, evt: Konva.KonvaEventObject<PointerEvent>) => void;
  onSelectLayer?: (layerId: string) => void;
  onUpdateLayerTransform?: (
    layerId: string,
    transform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
  ) => void;
  onEditTextLayer?: (layerId: string) => void;
  editingTextLayerId?: string | null;
  onCommitTextEdit?: (layerId: string, newText: string) => void;
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
  onSelectLayer,
  onUpdateLayerTransform,
  onEditTextLayer,
  editingTextLayerId,
  onCommitTextEdit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isDraggingHand, setIsDraggingHand] = useState(false);
  const isDraggingHandRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);

  const transformerRef = useRef<Konva.Transformer>(null);
  const layerNodesRef = useRef<Map<string, Konva.Node>>(new Map());

  const [prevEditingId, setPrevEditingId] = useState<string | null>(null);
  const [inlineEditText, setInlineEditText] = useState('');

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

  const activeLayer = document.layers.find((l) => l.id === document.activeLayerId);
  const editingLayer = document.layers.find((l) => l.id === editingTextLayerId) as TextLayer | undefined;

  if (editingTextLayerId !== prevEditingId) {
    setPrevEditingId(editingTextLayerId || null);
    setInlineEditText(editingLayer ? editingLayer.text : '');
  }

  useEffect(() => {
    if (
      transformerRef.current &&
      activeLayer &&
      !activeLayer.locked &&
      !activeLayer.isProtected &&
      (activeTool === 'select' || activeTool === 'text')
    ) {
      const node = layerNodesRef.current.get(activeLayer.id);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [document.activeLayerId, document.layers, activeTool, activeLayer]);

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
      setIsDraggingHand(true);
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
      setIsDraggingHand(false);
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
    setIsDraggingHand(false);
  };

  const handleNodeTransformEnd = (layerId: string, node: Konva.Node) => {
    if (onUpdateLayerTransform) {
      onUpdateLayerTransform(layerId, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      });
    }
  };

  const cursorStyle =
    activeTool === 'hand'
      ? isDraggingHand
        ? 'grabbing'
        : 'grab'
      : activeTool === 'zoom'
      ? 'zoom-in'
      : activeTool === 'eyedropper'
      ? 'copy'
      : activeTool === 'text'
      ? 'text'
      : 'crosshair';

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-zinc-950 relative overflow-hidden select-none touch-none"
      style={{ cursor: cursorStyle }}
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
                  ref={(node) => {
                    if (node) layerNodesRef.current.set(layer.id, node);
                    else layerNodesRef.current.delete(layer.id);
                  }}
                  x={layer.x}
                  y={layer.y}
                  rotation={layer.rotation || 0}
                  scaleX={layer.scaleX || 1}
                  scaleY={layer.scaleY || 1}
                  image={layer.canvas}
                  opacity={layer.opacity}
                  draggable={!layer.locked && !layer.isProtected && activeTool === 'select'}
                  onClick={() => onSelectLayer?.(layer.id)}
                  onTap={() => onSelectLayer?.(layer.id)}
                  onDragEnd={(e) => handleNodeTransformEnd(layer.id, e.target)}
                  onTransformEnd={(e) => handleNodeTransformEnd(layer.id, e.target)}
                />
              );
            }

            if (layer.type === 'image') {
              return (
                <KonvaImage
                  key={layer.id}
                  ref={(node) => {
                    if (node) layerNodesRef.current.set(layer.id, node);
                    else layerNodesRef.current.delete(layer.id);
                  }}
                  x={layer.x}
                  y={layer.y}
                  rotation={layer.rotation || 0}
                  scaleX={layer.scaleX || 1}
                  scaleY={layer.scaleY || 1}
                  image={layer.image}
                  width={layer.width}
                  height={layer.height}
                  opacity={layer.opacity}
                  draggable={!layer.locked && !layer.isProtected && activeTool === 'select'}
                  onClick={() => onSelectLayer?.(layer.id)}
                  onTap={() => onSelectLayer?.(layer.id)}
                  onDragEnd={(e) => handleNodeTransformEnd(layer.id, e.target)}
                  onTransformEnd={(e) => handleNodeTransformEnd(layer.id, e.target)}
                />
              );
            }

            if (layer.type === 'text') {
              const fontStyle = `${layer.bold ? 'bold ' : ''}${layer.italic ? 'italic' : ''}`.trim() || 'normal';
              return (
                <KonvaText
                  key={layer.id}
                  ref={(node) => {
                    if (node) layerNodesRef.current.set(layer.id, node);
                    else layerNodesRef.current.delete(layer.id);
                  }}
                  x={layer.x}
                  y={layer.y}
                  rotation={layer.rotation || 0}
                  scaleX={layer.scaleX || 1}
                  scaleY={layer.scaleY || 1}
                  text={layer.text}
                  fontSize={layer.fontSize}
                  fontFamily={layer.fontFamily}
                  fill={layer.color}
                  width={layer.width}
                  opacity={layer.opacity}
                  align={layer.align || 'left'}
                  fontStyle={fontStyle}
                  draggable={!layer.locked && !layer.isProtected && (activeTool === 'select' || activeTool === 'text')}
                  onClick={() => onSelectLayer?.(layer.id)}
                  onTap={() => onSelectLayer?.(layer.id)}
                  onDblClick={() => onEditTextLayer?.(layer.id)}
                  onDragEnd={(e) => handleNodeTransformEnd(layer.id, e.target)}
                  onTransformEnd={(e) => handleNodeTransformEnd(layer.id, e.target)}
                />
              );
            }

            return null;
          })}

          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
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

      {/* Inline Text Editor Overlay */}
      {editingLayer && editingTextLayerId && (
        <div
          className="absolute z-40 bg-zinc-900 border-2 border-sky-500 rounded p-2 shadow-2xl flex flex-col space-y-2 min-w-[200px]"
          style={{
            left: Math.max(10, Math.min(containerSize.width - 220, editingLayer.x * viewport.zoom + viewport.panX)),
            top: Math.max(10, Math.min(containerSize.height - 120, editingLayer.y * viewport.zoom + viewport.panY)),
          }}
        >
          <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">
            Edit Text
          </div>
          <textarea
            autoFocus
            value={inlineEditText}
            onChange={(e) => setInlineEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                onCommitTextEdit?.(editingTextLayerId, inlineEditText);
              }
            }}
            rows={3}
            className="w-full bg-zinc-950 text-zinc-100 p-1.5 rounded text-xs border border-zinc-700 focus:outline-none focus:border-sky-500 font-sans"
          />
          <div className="flex justify-end space-x-1">
            <button
              onClick={() => onCommitTextEdit?.(editingTextLayerId, inlineEditText)}
              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-medium"
            >
              Done (Ctrl+Enter)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
