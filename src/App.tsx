import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MenuBar } from './components/MenuBar';
import { ToolOptionsBar } from './components/ToolOptionsBar';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { CanvasArea } from './components/CanvasArea';
import { RightPanels } from './components/RightPanels';
import { NewDocumentModal } from './components/NewDocumentModal';
import { GuideModal } from './components/GuideModal';
import { AdjustmentsModal } from './components/AdjustmentsModal';
import { ResizeCanvasModal } from './components/ResizeCanvasModal';
import type {
  DocumentState,
  ToolType,
  ToolSettings,
  ViewportState,
  RasterLayer,
  ImageLayer,
  TextLayer,
  HistoryItem,
} from './types/editor';
import {
  createOffscreenCanvas,
  HistoryManager,
  loadImage,
  sampleCanvasColor,
} from './core/engine';
import { drawRasterStroke } from './core/drawing';
import {
  clearSelectionContent,
  fillSelectionContent,
  translateActiveLayer,
} from './core/selection';
import { exportDocumentFile } from './core/export';
import {
  cropDocument,
  resizeCanvas,
  rotateDocument,
  flipDocument,
  type AnchorPosition,
} from './core/documentOps';
import {
  applyAdjustmentsToActiveLayer,
  type AdjustmentSettings,
} from './core/adjustments';
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
    fontFamily: 'Arial',
    fontSize: 28,
    textAlign: 'left',
    textBold: false,
    textItalic: false,
  });

  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 0.5,
    panX: 100,
    panY: 50,
  });

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isAdjustmentsModalOpen, setIsAdjustmentsModalOpen] = useState(false);
  const [isResizeModalOpen, setIsResizeModalOpen] = useState(false);
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);

  // History State
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const historyRef = useRef<HistoryManager>(new HistoryManager());

  const syncHistoryState = useCallback(() => {
    setCanUndo(historyRef.current.canUndo);
    setCanRedo(historyRef.current.canRedo);
    setHistoryItems(historyRef.current.items);
    setHistoryIndex(historyRef.current.currentIndex);
  }, []);

  const isDrawingRef = useRef(false);
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    historyRef.current.recordAction('Initial Canvas', document).then(() => {
      syncHistoryState();
    });
    // Record initial action once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      syncHistoryState();
    },
    [syncHistoryState]
  );

  const handleFitScreen = useCallback(() => {
    const fit = calculateFitToScreenViewport(
      window.innerWidth - 300 - 14,
      window.innerHeight - 80 - 14,
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
    historyRef.current.recordAction('Create Document', newDoc).then(() => syncHistoryState());
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
      syncHistoryState();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExport = (format: 'png' | 'jpg' | 'webp') => {
    exportDocumentFile(document, format);
  };

  const handleUndo = useCallback(async () => {
    const restored = await historyRef.current.undo(document);
    if (restored) {
      setDocument(restored);
      syncHistoryState();
    }
  }, [document, syncHistoryState]);

  const handleRedo = useCallback(async () => {
    const restored = await historyRef.current.redo(document);
    if (restored) {
      setDocument(restored);
      syncHistoryState();
    }
  }, [document, syncHistoryState]);

  const handleJumpHistory = async (index: number) => {
    const restored = await historyRef.current.jumpTo(index, document);
    if (restored) {
      setDocument(restored);
      syncHistoryState();
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

  // Document Operations
  const handleCropToSelection = useCallback(() => {
    if (document.selection) {
      const cropped = cropDocument(document, document.selection);
      commitDocChange('Crop Canvas', cropped);
    }
  }, [document, commitDocChange]);

  const handleResizeCanvas = useCallback(
    (newW: number, newH: number, anchor: AnchorPosition) => {
      const resized = resizeCanvas(document, newW, newH, anchor);
      commitDocChange('Resize Canvas', resized);
    },
    [document, commitDocChange]
  );

  const handleRotateDocument = useCallback(
    (degrees: 90 | -90 | 180) => {
      const rotated = rotateDocument(document, degrees);
      commitDocChange(`Rotate Canvas ${degrees}°`, rotated);
    },
    [document, commitDocChange]
  );

  const handleFlipDocument = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      const flipped = flipDocument(document, direction);
      commitDocChange(`Flip Canvas ${direction}`, flipped);
    },
    [document, commitDocChange]
  );

  const handleApplyAdjustments = useCallback(
    (settings: AdjustmentSettings) => {
      const adjusted = applyAdjustmentsToActiveLayer(document, settings);
      commitDocChange('Apply Adjustments', adjusted);
    },
    [document, commitDocChange]
  );

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
    } else if (target.type === 'text') {
      const dupLayer: TextLayer = {
        ...target,
        id: 'text_dup_' + Date.now(),
        name: `${target.name} Copy`,
        isProtected: false,
        locked: false,
        x: target.x + 20,
        y: target.y + 20,
      };

      commitDocChange('Duplicate Layer', {
        ...document,
        layers: [...document.layers, dupLayer],
        activeLayerId: dupLayer.id,
      });
    }
  };

  const handleDeleteLayer = useCallback(
    (id: string) => {
      const target = document.layers.find((l) => l.id === id);
      if (!target || target.isProtected || document.layers.length <= 1) return;

      const remaining = document.layers.filter((l) => l.id !== id);
      commitDocChange('Delete Layer', {
        ...document,
        layers: remaining,
        activeLayerId: remaining[remaining.length - 1].id,
      });
    },
    [document, commitDocChange]
  );

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

  const handleUpdateLayerTransform = useCallback(
    (
      layerId: string,
      transform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
    ) => {
      const target = document.layers.find((l) => l.id === layerId);
      if (!target || target.locked || target.isProtected) return;

      const updatedLayers = document.layers.map((l) => {
        if (l.id === layerId) {
          return {
            ...l,
            x: Math.round(transform.x),
            y: Math.round(transform.y),
            rotation: transform.rotation,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
          };
        }
        return l;
      });

      commitDocChange('Transform Layer', {
        ...document,
        layers: updatedLayers,
      });
    },
    [document, commitDocChange]
  );

  const handleCommitTextEdit = (layerId: string, newText: string) => {
    const updatedLayers = document.layers.map((l) => {
      if (l.id === layerId && l.type === 'text') {
        return {
          ...l,
          text: newText,
        };
      }
      return l;
    });

    commitDocChange('Edit Text', {
      ...document,
      layers: updatedLayers,
    });
    setEditingTextLayerId(null);
  };

  const handleUpdateTextSettings = (newSettings: Partial<ToolSettings>) => {
    setToolSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (document.activeLayerId) {
        const activeL = document.layers.find((l) => l.id === document.activeLayerId);
        if (activeL && activeL.type === 'text' && !activeL.locked && !activeL.isProtected) {
          const updatedLayers = document.layers.map((l) => {
            if (l.id === activeL.id) {
              return {
                ...l,
                fontFamily: updated.fontFamily || (l as TextLayer).fontFamily,
                fontSize: updated.fontSize || (l as TextLayer).fontSize,
                color: updated.brushColor || (l as TextLayer).color,
                align: updated.textAlign || (l as TextLayer).align,
                bold: updated.textBold !== undefined ? updated.textBold : (l as TextLayer).bold,
                italic: updated.textItalic !== undefined ? updated.textItalic : (l as TextLayer).italic,
              };
            }
            return l;
          });
          setDocument((prevDoc) => ({ ...prevDoc, layers: updatedLayers }));
        }
      }
      return updated;
    });
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
        setEditingTextLayerId(null);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeLayerId) {
          handleDeleteLayer(document.activeLayerId);
          return;
        }
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
        case 't':
          setActiveTool('text');
          break;
        case 'i':
          setActiveTool('eyedropper');
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
  }, [handleUndo, handleRedo, handleSelectAll, handleDeselect, handleDeleteLayer, document.activeLayerId]);

  const handleCanvasPointerDown = (docX: number, docY: number) => {
    const activeLayer = document.layers.find((l) => l.id === document.activeLayerId);

    if (activeTool === 'eyedropper') {
      const sampledColor = sampleCanvasColor(document, docX, docY);
      setToolSettings((prev) => ({ ...prev, brushColor: sampledColor }));
      return;
    }

    if (activeTool === 'text') {
      const newTextLayer: TextLayer = {
        id: 'text_' + Date.now(),
        name: `Text ${document.layers.length + 1}`,
        type: 'text',
        visible: true,
        locked: false,
        opacity: 1,
        x: Math.round(docX),
        y: Math.round(docY),
        text: 'Type text here...',
        fontSize: toolSettings.fontSize || 28,
        fontFamily: toolSettings.fontFamily || 'Arial',
        color: toolSettings.brushColor || '#000000',
        width: 250,
        height: 60,
        align: toolSettings.textAlign || 'left',
        bold: toolSettings.textBold,
        italic: toolSettings.textItalic,
      };

      commitDocChange('Add Text Layer', {
        ...document,
        layers: [...document.layers, newTextLayer],
        activeLayerId: newTextLayer.id,
      });
      setEditingTextLayerId(newTextLayer.id);
      return;
    }

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

  const activeLayerObj = document.layers.find((l) => l.id === document.activeLayerId) || null;

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
        canUndo={canUndo}
        canRedo={canRedo}
        onSelectAll={handleSelectAll}
        onDeselect={handleDeselect}
        onAddLayer={handleAddLayer}
        onFitScreen={handleFitScreen}
        onZoom100={handleZoom100}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        documentName={document.name}
        hasSelection={!!document.selection}
        onCropToSelection={handleCropToSelection}
        onOpenResizeCanvas={() => setIsResizeModalOpen(true)}
        onRotateDocument={handleRotateDocument}
        onFlipDocument={handleFlipDocument}
        onOpenAdjustments={() => setIsAdjustmentsModalOpen(true)}
      />

      <ToolOptionsBar
        activeTool={activeTool}
        settings={toolSettings}
        onSettingsChange={handleUpdateTextSettings}
        hasSelection={!!document.selection}
        onClearSelectionContent={handleClearSelectionContent}
        onFillSelectionContent={handleFillSelectionContent}
        onDeselect={handleDeselect}
        onCropToSelection={handleCropToSelection}
      />

      <div className="flex flex-1 relative overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          currentColor={toolSettings.brushColor}
          onColorChange={(color) => handleUpdateTextSettings({ brushColor: color })}
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
          onSelectLayer={(id) => setDocument({ ...document, activeLayerId: id })}
          onUpdateLayerTransform={handleUpdateLayerTransform}
          onEditTextLayer={(id) => setEditingTextLayerId(id)}
          editingTextLayerId={editingTextLayerId}
          onCommitTextEdit={handleCommitTextEdit}
        />

        <RightPanels
          activeTool={activeTool}
          toolSettings={toolSettings}
          onSettingsChange={handleUpdateTextSettings}
          hasSelection={!!document.selection}
          onClearSelectionContent={handleClearSelectionContent}
          onFillSelectionContent={handleFillSelectionContent}
          onDeselect={handleDeselect}
          onCropToSelection={handleCropToSelection}
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
          historyItems={historyItems}
          historyIndex={historyIndex}
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

      <AdjustmentsModal
        isOpen={isAdjustmentsModalOpen}
        onClose={() => setIsAdjustmentsModalOpen(false)}
        activeLayer={activeLayerObj}
        onApply={handleApplyAdjustments}
      />

      <ResizeCanvasModal
        isOpen={isResizeModalOpen}
        onClose={() => setIsResizeModalOpen(false)}
        currentWidth={document.width}
        currentHeight={document.height}
        onResize={handleResizeCanvas}
      />
    </div>
  );
}

export default App;
