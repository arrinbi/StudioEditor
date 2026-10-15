import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text as KonvaText, Transformer } from 'react-konva';
import Konva from 'konva';
import type { DocumentState, ViewportState, ToolType, TextLayer } from '../types/editor';
import { CanvasScrollbar } from './CanvasScrollbar';
import {
  calculateScrollBounds,
  panToScrollRatio,
  scrollRatioToPan,
  calculateThumbSize,
} from '../utils/viewport';

const SCROLLBAR_SIZE = 14;

interface InlineTextEditorProps {
  editingLayer: TextLayer;
  stageWidth: number;
  stageHeight: number;
  viewport: ViewportState;
  onCommitTextEdit?: (layerId: string, newText: string) => void;
}

const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  editingLayer,
  stageWidth,
  stageHeight,
  viewport,
  onCommitTextEdit,
}) => {
  const [text, setText] = useState(editingLayer.text);

  return (
    <div
      className="absolute z-40 bg-zinc-900 border-2 border-sky-500 rounded p-2 shadow-2xl flex flex-col space-y-2 min-w-[200px]"
      style={{
        left: Math.max(10, Math.min(stageWidth - 220, editingLayer.x * viewport.zoom + viewport.panX)),
        top: Math.max(10, Math.min(stageHeight - 120, editingLayer.y * viewport.zoom + viewport.panY)),
      }}
    >
      <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">
        Edit Text
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            onCommitTextEdit?.(editingLayer.id, text);
          }
        }}
        rows={3}
        className="w-full bg-zinc-950 text-zinc-100 p-1.5 rounded text-xs border border-zinc-700 focus:outline-none focus:border-sky-500 font-sans"
      />
      <div className="flex justify-end space-x-1">
        <button
          onClick={() => onCommitTextEdit?.(editingLayer.id, text)}
          className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-medium"
        >
          Done (Ctrl+Enter)
        </button>
      </div>
    </div>
  );
};

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

  const stageWidth = Math.max(1, containerSize.width - SCROLLBAR_SIZE);
  const stageHeight = Math.max(1, containerSize.height - SCROLLBAR_SIZE);

  const scrollBounds = calculateScrollBounds(
    stageWidth,
    stageHeight,
    document.width,
    document.height,
    viewport.zoom,
    40
  );

  const scrollRatioX = panToScrollRatio(viewport.panX, scrollBounds.minPanX, scrollBounds.maxPanX);
  const scrollRatioY = panToScrollRatio(viewport.panY, scrollBounds.minPanY, scrollBounds.maxPanY);

  const thumbSizeX = calculateThumbSize(
    stageWidth,
    document.width * viewport.zoom,
    stageWidth,
    40,
    24
  );

  const thumbSizeY = calculateThumbSize(
    stageHeight,
    document.height * viewport.zoom,
    stageHeight,
    40,
    24
  );

  const handleScrollXChange = (newRatio: number) => {
    const newPanX = scrollRatioToPan(newRatio, scrollBounds.minPanX, scrollBounds.maxPanX);
    onViewportChange({
      ...viewport,
      panX: newPanX,
    });
  };

  const handleScrollYChange = (newRatio: number) => {
    const newPanY = scrollRatioToPan(newRatio, scrollBounds.minPanY, scrollBounds.maxPanY);
    onViewportChange({
      ...viewport,
      panY: newPanY,
    });
  };

  const activeLayer = document.layers.find((l) => l.id === document.activeLayerId);
  const editingLayer = document.layers.find((l) => l.id === editingTextLayerId) as TextLayer | undefined;

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

    // Zoom if Ctrl/Cmd key is pressed or activeTool === 'zoom'
    if (e.evt.ctrlKey || e.evt.metaKey) {
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
      return;
    }

    // Horizontal scroll if Shift key is pressed or deltaX is non-zero
    if (e.evt.shiftKey || e.evt.deltaX !== 0) {
      const delta = e.evt.deltaX !== 0 ? e.evt.deltaX : e.evt.deltaY;
      let newPanX = viewport.panX - delta;

      if (scrollBounds.isXScrollable) {
        newPanX = Math.max(scrollBounds.minPanX, Math.min(scrollBounds.maxPanX, newPanX));
      }

      onViewportChange({
        ...viewport,
        panX: newPanX,
      });
      return;
    }

    // Vertical scroll (default wheel action)
    const delta = e.evt.deltaY;
    let newPanY = viewport.panY - delta;

    if (scrollBounds.isYScrollable) {
      newPanY = Math.max(scrollBounds.minPanY, Math.min(scrollBounds.maxPanY, newPanY));
    }

    onViewportChange({
      ...viewport,
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
      <div style={{ width: stageWidth, height: stageHeight, position: 'absolute', left: 0, top: 0 }}>
        <Stage
          width={stageWidth}
          height={stageHeight}
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
      </div>

      {/* Vertical Scrollbar */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: SCROLLBAR_SIZE, height: stageHeight }}>
        <CanvasScrollbar
          orientation="vertical"
          trackLength={stageHeight}
          scrollRatio={scrollRatioY}
          thumbSize={thumbSizeY}
          isScrollable={scrollBounds.isYScrollable}
          onScrollChange={handleScrollYChange}
          scrollbarSize={SCROLLBAR_SIZE}
        />
      </div>

      {/* Horizontal Scrollbar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: stageWidth, height: SCROLLBAR_SIZE }}>
        <CanvasScrollbar
          orientation="horizontal"
          trackLength={stageWidth}
          scrollRatio={scrollRatioX}
          thumbSize={thumbSizeX}
          isScrollable={scrollBounds.isXScrollable}
          onScrollChange={handleScrollXChange}
          scrollbarSize={SCROLLBAR_SIZE}
        />
      </div>

      {/* Scrollbar Junction Box */}
      <div
        className="bg-zinc-900 border-t border-l border-zinc-800"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: SCROLLBAR_SIZE,
          height: SCROLLBAR_SIZE,
        }}
      />

      {/* Inline Text Editor Overlay */}
      {editingLayer && editingTextLayerId && (
        <InlineTextEditor
          key={editingTextLayerId}
          editingLayer={editingLayer}
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          viewport={viewport}
          onCommitTextEdit={onCommitTextEdit}
        />
      )}
    </div>
  );
};
