import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MenuBar } from './components/MenuBar';
import { ToolOptionsBar } from './components/ToolOptionsBar';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { CanvasArea } from './components/CanvasArea';
import { RightPanels } from './components/RightPanels';
import { NewDocumentModal } from './components/NewDocumentModal';
import { GuideModal } from './components/GuideModal';
import type {
  DocumentState,
  ToolType,
  ToolSettings,
  ViewportState,
  RasterLayer,
  ImageLayer,
} from './types/editor';
import {
  createOffscreenCanvas,
  HistoryManager,
  loadImage,
} from './core/engine';
import { drawRasterStroke } from './core/drawing';
import {
  clearSelectionContent,
  fillSelectionContent,
  translateActiveLayer,
} from './core/selection';
import { exportDocumentFile } from './core/export';
import { calculateFitToScreenViewport } from './utils/viewport';
import { saveProjectToIDB } from './services/storage';

export function App() {
  const [document, setDocument] = useState<DocumentState>(() => {
    const canvas = createOffscreenCanvas(1080, 1620);
    return {
      id: 'doc_' + Date.now(),
      name: 'Untitled Project',
      width: 1080,
      height: 1620,
      layers: [
        {
          id: 'base_raster',
          name: 'Base Raster Layer',
          type: 'raster',
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
          canvas,
        },
      ],
      activeLayerId: 'base_raster',
      selection: null,
    };
  });

  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [toolSettings, setToolSettings] = useState<ToolSettings>({
    brushSize: 20,
    brushColor: '#000000',
    brushOpacity: 1,
    brushHardness: 0.8,
    eraserSize: 30,
    eraserOpacity: 1,
  });

  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 0.5,
    panX: 100,
    panY: 50,
  });

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const historyRef = useRef<HistoryManager>(new HistoryManager());
  const [, setHistoryTick] = useState(0);

  const isDrawingRef = useRef(false);
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    historyRef.current.recordAction('Initial Canvas', document).then(() => {
      setHistoryTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveProjectToIDB({
        id: document.id,
        name: document.name,
        width: document.width,
        height: document.height,
        updatedAt: Date.now(),
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [document]);

  const commitDocChange = useCallback(
    async (description: string, newDoc: DocumentState) => {
      setDocument(newDoc);
      await historyRef.current.recordAction(description, newDoc);
      setHistoryTick((t) => t + 1);
    },
    []
  );

  const handleFitScreen = useCallback(() => {
    const fit = calculateFitToScreenViewport(
      window.innerWidth - 300,
      window.innerHeight - 80,
      document.width,
      document.height,
      40
    );
    setViewport(fit);
  }, [document.width, document.height]);

  const handleZoom100 = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: 1.0,
    }));
  }, []);

  const handleZoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(20, prev.zoom * 1.25),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(0.05, prev.zoom / 1.25),
    }));
  }, []);

  const handleCreateNewDocument = (name: string, width: number, height: number) => {
    const newCanvas = createOffscreenCanvas(width, height);
    const newDoc: DocumentState = {
      id: 'doc_' + Date.now(),
      name,
      width,
      height,
      layers: [
        {
          id: 'base_raster_' + Date.now(),
          name: 'Base Raster Layer',
          type: 'raster',
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
          canvas: newCanvas,
        },
      ],
      activeLayerId: 'base_raster_' + Date.now(),
      selection: null,
    };
    historyRef.current = new HistoryManager();
    setDocument(newDoc);
    historyRef.current.recordAction('Create Document', newDoc).then(() => setHistoryTick((t) => t + 1));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleOpenImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const src = evt.target?.result as string;
      const img = await loadImage(src);

      const isProtected = true;
      const imgLayer: ImageLayer = {
        id: 'img_' + Date.now(),
        name: file.name,
        type: 'image',
        visible: true,
        locked: true,
        opacity: 1,
        isProtected,
        x: 0,
        y: 0,
        image: img,
        src,
        width: img.width,
        height: img.height,
      };

      const drawingCanvas = createOffscreenCanvas(img.width, img.height);
      const drawLayer: RasterLayer = {
        id: 'raster_' + Date.now(),
        name: 'Cleaning / Edits Layer',
        type: 'raster',
        visible: true,
        locked: false,
        opacity: 1,
        x: 0,
        y: 0,
        canvas: drawingCanvas,
      };

      const newDoc: DocumentState = {
        id: 'doc_' + Date.now(),
        name: file.name,
        width: img.width,
        height: img.height,
        layers: [imgLayer, drawLayer],
        activeLayerId: drawLayer.id,
        selection: null,
      };

      historyRef.current = new HistoryManager();
      setDocument(newDoc);
      await historyRef.current.recordAction('Open Image', newDoc);
      setHistoryTick((t) => t + 1);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExport = (format: 'png' | 'jpg') => {
    exportDocumentFile(document, format);
  };

  const handleUndo = async () => {
    const restored = await historyRef.current.undo(document);
    if (restored) {
      setDocument(restored);
      setHistoryTick((t) => t + 1);
    }
  };

  const handleRedo = async () => {
    const restored = await historyRef.current.redo(document);
    if (restored) {
      setDocument(restored);
      setHistoryTick((t) => t + 1);
    }
  };

  const handleJumpHistory = async (index: number) => {
    const restored = await historyRef.current.jumpTo(index, document);
    if (restored) {
      setDocument(restored);
      setHistoryTick((t) => t + 1);
    }
  };

  const handleSelectAll = useCallback(() => {
    commitDocChange('Select All', {
      ...document,
      selection: { x: 0, y: 0, width: document.width, height: document.height },
    });
  }, [commitDocChange, document]);

  const handleDeselect = useCallback(() => {
    if (document.selection) {
      commitDocChange('Deselect', {
        ...document,
        selection: null,
      });
    }
  }, [commitDocChange, document]);

  const handleClearSelectionContent = () => {
    if (clearSelectionContent(document)) {
      commitDocChange('Clear Selection', { ...document });
    }
  };

  const handleFillSelectionContent = () => {
    if (fillSelectionContent(document, toolSettings.brushColor)) {
      commitDocChange('Fill Selection', { ...document });
    }
  };

  const handleAddLayer = () => {
    const newCanvas = createOffscreenCanvas(document.width, document.height);
    const newLayer: RasterLayer = {
      id: 'layer_' + Date.now(),
      name: `Layer ${document.layers.length + 1}`,
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas: newCanvas,
    };

    commitDocChange('Add Layer', {
      ...document,
      layers: [...document.layers, newLayer],
      activeLayerId: newLayer.id,
    });
  };

  const handleRenameLayer = (id: string, newName: string) => {
    const updated = document.layers.map((l) => (l.id === id ? { ...l, name: newName } : l));
    commitDocChange('Rename Layer', {
      ...document,
      layers: updated,
    });
  };

  const handleDuplicateLayer = (id: string) => {
    const target = document.layers.find((l) => l.id === id);
    if (!target) return;

    if (target.type === 'raster') {
      const dupCanvas = createOffscreenCanvas(target.canvas.width, target.canvas.height);
      const ctx = dupCanvas.getContext('2d');
      ctx?.drawImage(target.canvas, 0, 0);

      const dupLayer: RasterLayer = {
        ...target,
        id: 'layer_dup_' + Date.now(),
        name: `${target.name} Copy`,
        isProtected: false,
        locked: false,
        canvas: dupCanvas,
      };

      commitDocChange('Duplicate Layer', {
        ...document,
        layers: [...document.layers, dupLayer],
        activeLayerId: dupLayer.id,
      });
    }
  };

  const handleDeleteLayer = (id: string) => {
    const target = document.layers.find((l) => l.id === id);
    if (!target || target.isProtected || document.layers.length <= 1) return;

    const remaining = document.layers.filter((l) => l.id !== id);
    commitDocChange('Delete Layer', {
      ...document,
      layers: remaining,
      activeLayerId: remaining[remaining.length - 1].id,
    });
  };

  const handleToggleVisibility = (id: string) => {
    const updated = document.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
    setDocument({ ...document, layers: updated });
  };

  const handleToggleLock = (id: string) => {
    const updated = document.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l));
    setDocument({ ...document, layers: updated });
  };

  const handleReorderLayer = (id: string, direction: 'up' | 'down') => {
    const index = document.layers.findIndex((l) => l.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= document.layers.length) return;

    const newLayers = [...document.layers];
    const [moved] = newLayers.splice(index, 1);
    newLayers.splice(targetIndex, 0, moved);

    commitDocChange('Reorder Layers', {
      ...document,
      layers: newLayers,
    });
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    const updated = document.layers.map((l) => (l.id === id ? { ...l, opacity } : l));
    setDocument({ ...document, layers: updated });
  };

  // Keyboard Hotkeys Manager
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      if (ctrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      if (e.key === 'Escape') {
        handleDeselect();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'b':
          setActiveTool('brush');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'm':
          setActiveTool('rectangle-select');
          break;
        case 'h':
          setActiveTool('hand');
          break;
        case 'z':
          setActiveTool('zoom');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSelectAll, handleDeselect]);

  const handleCanvasPointerDown = (docX: number, docY: number) => {
    const activeLayer = document.layers.find((l) => l.id === document.activeLayerId);

    if (activeTool === 'brush' || activeTool === 'eraser') {
      if (!activeLayer || activeLayer.type !== 'raster' || activeLayer.locked) return;
      isDrawingRef.current = true;
      lastDrawPointRef.current = { x: docX, y: docY };

      drawRasterStroke(
        activeLayer,
        { x: docX, y: docY },
        { x: docX, y: docY },
        toolSettings,
        activeTool === 'eraser'
      );
      setDocument({ ...document });
      return;
    }

    if (activeTool === 'rectangle-select') {
      selectionStartRef.current = { x: docX, y: docY };
      setDocument({
        ...document,
        selection: { x: docX, y: docY, width: 0, height: 0 },
      });
      return;
    }

    if (activeTool === 'select') {
      lastDrawPointRef.current = { x: docX, y: docY };
      isDrawingRef.current = true;
    }
  };

  const handleCanvasPointerMove = (docX: number, docY: number) => {
    const activeLayer = document.layers.find((l) => l.id === document.activeLayerId);

    if ((activeTool === 'brush' || activeTool === 'eraser') && isDrawingRef.current) {
      if (!activeLayer || activeLayer.type !== 'raster' || activeLayer.locked) return;
      if (lastDrawPointRef.current) {
        drawRasterStroke(
          activeLayer,
          lastDrawPointRef.current,
          { x: docX, y: docY },
          toolSettings,
          activeTool === 'eraser'
        );
        lastDrawPointRef.current = { x: docX, y: docY };
        setDocument({ ...document });
      }
      return;
    }

    if (activeTool === 'rectangle-select' && selectionStartRef.current) {
      const start = selectionStartRef.current;
      const x = Math.min(start.x, docX);
      const y = Math.min(start.y, docY);
      const width = Math.abs(docX - start.x);
      const height = Math.abs(docY - start.y);

      setDocument({
        ...document,
        selection: { x, y, width, height },
      });
      return;
    }

    if (activeTool === 'select' && isDrawingRef.current && lastDrawPointRef.current) {
      const dx = docX - lastDrawPointRef.current.x;
      const dy = docY - lastDrawPointRef.current.y;
      lastDrawPointRef.current = { x: docX, y: docY };

      setDocument((prev) => translateActiveLayer(prev, dx, dy));
    }
  };

  const handleCanvasPointerUp = () => {
    if ((activeTool === 'brush' || activeTool === 'eraser') && isDrawingRef.current) {
      isDrawingRef.current = false;
      lastDrawPointRef.current = null;
      commitDocChange(activeTool === 'brush' ? 'Brush Stroke' : 'Eraser Stroke', document);
      return;
    }

    if (activeTool === 'rectangle-select' && selectionStartRef.current) {
      selectionStartRef.current = null;
      if (document.selection && document.selection.width > 2 && document.selection.height > 2) {
        commitDocChange('Select Area', document);
      } else {
        setDocument({ ...document, selection: null });
      }
      return;
    }

    if (activeTool === 'select' && isDrawingRef.current) {
      isDrawingRef.current = false;
      lastDrawPointRef.current = null;
      commitDocChange('Move Layer', document);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-900 select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <MenuBar
        onNewDocument={() => setIsNewModalOpen(true)}
        onOpenImage={handleOpenImageClick}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyRef.current.canUndo}
        canRedo={historyRef.current.canRedo}
        onSelectAll={handleSelectAll}
        onDeselect={handleDeselect}
        onAddLayer={handleAddLayer}
        onFitScreen={handleFitScreen}
        onZoom100={handleZoom100}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        documentName={document.name}
      />

      <ToolOptionsBar
        activeTool={activeTool}
        settings={toolSettings}
        onSettingsChange={(newSet) => setToolSettings((prev) => ({ ...prev, ...newSet }))}
        hasSelection={!!document.selection}
        onClearSelectionContent={handleClearSelectionContent}
        onFillSelectionContent={handleFillSelectionContent}
        onDeselect={handleDeselect}
      />

      <div className="flex flex-1 relative overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          currentColor={toolSettings.brushColor}
          onColorChange={(color) => setToolSettings((prev) => ({ ...prev, brushColor: color }))}
        />

        <CanvasArea
          document={document}
          viewport={viewport}
          activeTool={activeTool}
          onViewportChange={setViewport}
          onCursorMove={setCursorPos}
          onCanvasPointerDown={handleCanvasPointerDown}
          onCanvasPointerMove={handleCanvasPointerMove}
          onCanvasPointerUp={handleCanvasPointerUp}
        />

        <RightPanels
          activeTool={activeTool}
          toolSettings={toolSettings}
          onSettingsChange={(newSet) => setToolSettings({ ...toolSettings, ...newSet })}
          hasSelection={!!document.selection}
          onClearSelectionContent={handleClearSelectionContent}
          onFillSelectionContent={handleFillSelectionContent}
          onDeselect={handleDeselect}
          layers={document.layers}
          activeLayerId={document.activeLayerId}
          onSelectLayer={(id) => setDocument({ ...document, activeLayerId: id })}
          onRenameLayer={handleRenameLayer}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onAddLayer={handleAddLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onDeleteLayer={handleDeleteLayer}
          onReorderLayer={handleReorderLayer}
          onOpacityChange={handleOpacityChange}
          historyItems={historyRef.current.items}
          historyIndex={historyRef.current.currentIndex}
          onJumpHistory={handleJumpHistory}
        />
      </div>

      <StatusBar
        zoomRatio={viewport.zoom}
        width={document.width}
        height={document.height}
        cursorPos={cursorPos}
        activeTool={activeTool}
        onFitScreen={handleFitScreen}
        onZoom100={handleZoom100}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      <NewDocumentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateNewDocument}
      />

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}

export default App;
