import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { SettingsModal } from './components/SettingsModal';
import type {
  DocumentState,
  ProjectState,
  Page,
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
import {
  exportDocumentFile,
  exportProjectToPDF,
  exportProjectToZIP,
} from './core/export';
import {
  createDefaultPage,
  createInitialProject,
  duplicatePage,
  reorderPages,
  renderPageThumbnail,
} from './core/multiPage';
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
import {
  updateOcrRegionText,
  updateOcrRegionBBox,
  deleteOcrRegion,
  clearAllOcrRegions,
  selectOcrRegion,
  extractOcrSourceCanvas,
  cropCanvasRegion,
  addOcrRegions,
} from './core/ocr';
import { runCropOcrEngine } from './services/ocrEngine';
import { getOcrConfig } from './services/aiSettings';
import { calculateFitToScreenViewport } from './utils/viewport';
import { saveProjectStateToIDB, getProjectsFromIDB, loadProjectFromIDB } from './services/storage';

export function App() {
  const [project, setProject] = useState<ProjectState>(() =>
    createInitialProject('Untitled Project', 1080, 1620)
  );

  const activePage = useMemo(() => {
    return project.pages.find((p) => p.id === project.activePageId) || project.pages[0];
  }, [project]);

  const activeDocument: DocumentState = useMemo(() => {
    return {
      id: activePage.id,
      name: activePage.name,
      width: activePage.width,
      height: activePage.height,
      layers: activePage.layers,
      activeLayerId: activePage.activeLayerId,
      selection: activePage.selection,
    };
  }, [activePage]);

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

  const [rightPanelTab, setRightPanelTab] = useState<'pages' | 'layers' | 'ocr' | 'properties' | 'history'>('pages');
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isAdjustmentsModalOpen, setIsAdjustmentsModalOpen] = useState(false);
  const [isResizeModalOpen, setIsResizeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Manual OCR Region Drawing & Recognition State
  const [isDrawingManualRegion, setIsDrawingManualRegion] = useState(false);
  const [manualRegionDraft, setManualRegionDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [ocrScope, setOcrScope] = useState<'composite' | string>('composite');
  const [isCropOcrRunning, setIsCropOcrRunning] = useState(false);
  const manualRegionStartRef = useRef<{ x: number; y: number } | null>(null);

  // Per-page History Managers
  const historyMapRef = useRef<Map<string, HistoryManager>>(new Map());

  const getHistoryManager = useCallback((pageId: string) => {
    if (!historyMapRef.current.has(pageId)) {
      historyMapRef.current.set(pageId, new HistoryManager());
    }
    return historyMapRef.current.get(pageId)!;
  }, []);

  // History State for current active page
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const syncHistoryState = useCallback(() => {
    const manager = getHistoryManager(activePage.id);
    setCanUndo(manager.canUndo);
    setCanRedo(manager.canRedo);
    setHistoryItems(manager.items);
    setHistoryIndex(manager.currentIndex);
  }, [activePage.id, getHistoryManager]);

  const isDrawingRef = useRef(false);
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  // Restore latest saved project from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const savedProjects = await getProjectsFromIDB();
        if (savedProjects.length > 0 && isMounted) {
          savedProjects.sort((a, b) => b.updatedAt - a.updatedAt);
          const restored = await loadProjectFromIDB(savedProjects[0].id);
          if (restored && restored.pages.length > 0 && isMounted) {
            setProject(restored);
            restored.pages.forEach((p) => {
              const manager = getHistoryManager(p.id);
              const docState: DocumentState = {
                id: p.id,
                name: p.name,
                width: p.width,
                height: p.height,
                layers: p.layers,
                activeLayerId: p.activeLayerId,
                selection: p.selection,
              };
              manager.recordAction('Loaded Page State', docState);
            });
          }
        }
      } catch (err) {
        console.error('Failed to restore project:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [getHistoryManager]);

  // Record initial state when active page changes if history is empty
  useEffect(() => {
    const manager = getHistoryManager(activePage.id);
    if (manager.items.length === 0) {
      manager.recordAction('Initial Page State', activeDocument).then(() => {
        syncHistoryState();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage.id]);

  // Autosave timer
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProjectStateToIDB(project).catch((err) => {
        console.error('Autosave error:', err);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [project]);

  const updateActivePage = useCallback(
    (updater: (prevPage: Page) => Page, description?: string) => {
      setProject((prevProj) => {
        const targetIndex = prevProj.pages.findIndex((p) => p.id === prevProj.activePageId);
        if (targetIndex === -1) return prevProj;

        const oldPage = prevProj.pages[targetIndex];
        const newPage = updater(oldPage);
        newPage.thumbnailDataUrl = renderPageThumbnail(newPage);

        if (description) {
          const docState: DocumentState = {
            id: newPage.id,
            name: newPage.name,
            width: newPage.width,
            height: newPage.height,
            layers: newPage.layers,
            activeLayerId: newPage.activeLayerId,
            selection: newPage.selection,
          };
          const manager = getHistoryManager(newPage.id);
          manager.recordAction(description, docState).then(() => syncHistoryState());
        }

        const newPages = [...prevProj.pages];
        newPages[targetIndex] = newPage;

        return {
          ...prevProj,
          pages: newPages,
        };
      });
    },
    [getHistoryManager, syncHistoryState]
  );

  const commitDocChange = useCallback(
    (description: string, newDoc: DocumentState) => {
      updateActivePage((prevPage) => ({
        ...prevPage,
        width: newDoc.width,
        height: newDoc.height,
        layers: newDoc.layers,
        activeLayerId: newDoc.activeLayerId,
        selection: newDoc.selection,
      }), description);
    },
    [updateActivePage]
  );

  // OCR Action Handlers
  const handleSelectOcrRegion = useCallback((regionId: string | null) => {
    updateActivePage((prev) => selectOcrRegion(prev, regionId));
  }, [updateActivePage]);

  const handleRunOcrOnRegion = useCallback(async (regionId: string) => {
    const targetRegion = activePage.ocrRegions?.find((r) => r.id === regionId);
    if (!targetRegion) return;

    setIsCropOcrRunning(true);
    try {
      const fullSourceCanvas = extractOcrSourceCanvas(
        activePage,
        ocrScope === 'composite' ? null : ocrScope
      );
      const cropped = cropCanvasRegion(fullSourceCanvas, targetRegion.bbox);
      const currentConfig = getOcrConfig();

      const recognizedRegions = await runCropOcrEngine(cropped, targetRegion.bbox, {
        lang: (currentConfig.model || 'eng+ind') as 'eng' | 'ind' | 'eng+ind',
        pageId: activePage.id,
        sourceWidth: activePage.width,
        sourceHeight: activePage.height,
        config: currentConfig,
      });

      const recognizedText = recognizedRegions.map((r) => r.text).filter(Boolean).join('\n').trim();

      if (recognizedText) {
        updateActivePage((prev) => updateOcrRegionText(prev, regionId, recognizedText), 'Recognize Region OCR Text');
      }
    } catch (err) {
      console.error('Failed to recognize region text:', err);
    } finally {
      setIsCropOcrRunning(false);
    }
  }, [activePage, ocrScope, updateActivePage]);

  const handleUpdateOcrText = useCallback((regionId: string, newText: string) => {
    updateActivePage((prev) => updateOcrRegionText(prev, regionId, newText), 'Edit OCR Text');
  }, [updateActivePage]);

  const handleUpdateOcrBBox = useCallback((
    regionId: string,
    newBBox: { x: number; y: number; width: number; height: number }
  ) => {
    updateActivePage((prev) => updateOcrRegionBBox(prev, regionId, newBBox), 'Resize OCR Region');
  }, [updateActivePage]);

  const handleDeleteOcrRegion = useCallback((regionId: string) => {
    updateActivePage((prev) => deleteOcrRegion(prev, regionId), 'Delete OCR Region');
  }, [updateActivePage]);

  const handleClearAllOcrRegions = useCallback(() => {
    updateActivePage((prev) => clearAllOcrRegions(prev), 'Clear OCR Regions');
  }, [updateActivePage]);

  const handleFitScreen = useCallback(() => {
    const fit = calculateFitToScreenViewport(
      window.innerWidth - 300 - 14,
      window.innerHeight - 80 - 14,
      activeDocument.width,
      activeDocument.height,
      40
    );
    setViewport(fit);
  }, [activeDocument.width, activeDocument.height]);

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

  // Page Operations
  const handleSelectPage = (pageId: string) => {
    setProject((prev) => ({
      ...prev,
      activePageId: pageId,
    }));
  };

  const handleAddPage = () => {
    const newPage = createDefaultPage(
      activePage.width,
      activePage.height,
      `Page ${project.pages.length + 1}`
    );
    newPage.thumbnailDataUrl = renderPageThumbnail(newPage);

    setProject((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
      activePageId: newPage.id,
    }));
  };

  const handleDuplicatePage = (pageId: string) => {
    const target = project.pages.find((p) => p.id === pageId);
    if (!target) return;

    const dup = duplicatePage(target);
    const targetIdx = project.pages.findIndex((p) => p.id === pageId);
    const newPages = [...project.pages];
    newPages.splice(targetIdx + 1, 0, dup);

    setProject((prev) => ({
      ...prev,
      pages: newPages,
      activePageId: dup.id,
    }));
  };

  const handleDeletePage = (pageId: string) => {
    if (project.pages.length <= 1) return;

    const newPages = project.pages.filter((p) => p.id !== pageId);
    const nextActiveId =
      project.activePageId === pageId
        ? newPages[0].id
        : project.activePageId;

    historyMapRef.current.delete(pageId);

    setProject((prev) => ({
      ...prev,
      pages: newPages,
      activePageId: nextActiveId,
    }));
  };

  const handleReorderPage = (fromIndex: number, toIndex: number) => {
    const newPages = reorderPages(project.pages, fromIndex, toIndex);
    setProject((prev) => ({
      ...prev,
      pages: newPages,
    }));
  };

  const handleCreateNewDocument = (name: string, width: number, height: number) => {
    const newProj = createInitialProject(name, width, height);
    historyMapRef.current.clear();
    setProject(newProj);
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

      const newPage: Page = {
        id: 'page_' + Date.now(),
        name: file.name,
        width: img.width,
        height: img.height,
        layers: [imgLayer, drawLayer],
        activeLayerId: drawLayer.id,
        selection: null,
      };
      newPage.thumbnailDataUrl = renderPageThumbnail(newPage);

      setProject((prev) => ({
        ...prev,
        pages: [...prev.pages, newPage],
        activePageId: newPage.id,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExportSingle = (format: 'png' | 'jpg' | 'webp') => {
    exportDocumentFile(activeDocument, format);
  };

  const handleExportPDF = async () => {
    try {
      setExportMessage('Generating multi-page PDF...');
      await exportProjectToPDF(project, (current, total) => {
        setExportMessage(`Rendering PDF page ${current} of ${total}...`);
      });
      setExportMessage('PDF export complete!');
      setTimeout(() => setExportMessage(null), 2500);
    } catch (err) {
      console.error('PDF export failed:', err);
      setExportMessage('PDF export failed.');
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  const handleExportZIP = async (format: 'png' | 'jpeg') => {
    try {
      setExportMessage(`Packaging ZIP (${format.toUpperCase()})...`);
      await exportProjectToZIP(project, format, (current, total) => {
        setExportMessage(`Adding page ${current} of ${total} to ZIP...`);
      });
      setExportMessage('ZIP export complete!');
      setTimeout(() => setExportMessage(null), 2500);
    } catch (err) {
      console.error('ZIP export failed:', err);
      setExportMessage('ZIP export failed.');
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  const handleUndo = useCallback(async () => {
    const manager = getHistoryManager(activePage.id);
    const restored = await manager.undo(activeDocument);
    if (restored) {
      commitDocChange('Undo', restored);
      syncHistoryState();
    }
  }, [activePage.id, activeDocument, getHistoryManager, commitDocChange, syncHistoryState]);

  const handleRedo = useCallback(async () => {
    const manager = getHistoryManager(activePage.id);
    const restored = await manager.redo(activeDocument);
    if (restored) {
      commitDocChange('Redo', restored);
      syncHistoryState();
    }
  }, [activePage.id, activeDocument, getHistoryManager, commitDocChange, syncHistoryState]);

  const handleJumpHistory = async (index: number) => {
    const manager = getHistoryManager(activePage.id);
    const restored = await manager.jumpTo(index, activeDocument);
    if (restored) {
      commitDocChange('History Jump', restored);
      syncHistoryState();
    }
  };

  const handleSelectAll = useCallback(() => {
    commitDocChange('Select All', {
      ...activeDocument,
      selection: { x: 0, y: 0, width: activeDocument.width, height: activeDocument.height },
    });
  }, [commitDocChange, activeDocument]);

  const handleDeselect = useCallback(() => {
    if (activeDocument.selection) {
      commitDocChange('Deselect', {
        ...activeDocument,
        selection: null,
      });
    }
  }, [commitDocChange, activeDocument]);

  const handleClearSelectionContent = () => {
    if (clearSelectionContent(activeDocument)) {
      commitDocChange('Clear Selection', { ...activeDocument });
    }
  };

  const handleFillSelectionContent = () => {
    if (fillSelectionContent(activeDocument, toolSettings.brushColor)) {
      commitDocChange('Fill Selection', { ...activeDocument });
    }
  };

  // Document Operations
  const handleCropToSelection = useCallback(() => {
    if (activeDocument.selection) {
      const cropped = cropDocument(activeDocument, activeDocument.selection);
      commitDocChange('Crop Canvas', cropped);
    }
  }, [activeDocument, commitDocChange]);

  const handleResizeCanvas = useCallback(
    (newW: number, newH: number, anchor: AnchorPosition) => {
      const resized = resizeCanvas(activeDocument, newW, newH, anchor);
      commitDocChange('Resize Canvas', resized);
    },
    [activeDocument, commitDocChange]
  );

  const handleRotateDocument = useCallback(
    (degrees: 90 | -90 | 180) => {
      const rotated = rotateDocument(activeDocument, degrees);
      commitDocChange(`Rotate Canvas ${degrees}°`, rotated);
    },
    [activeDocument, commitDocChange]
  );

  const handleFlipDocument = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      const flipped = flipDocument(activeDocument, direction);
      commitDocChange(`Flip Canvas ${direction}`, flipped);
    },
    [activeDocument, commitDocChange]
  );

  const handleApplyAdjustments = useCallback(
    (settings: AdjustmentSettings) => {
      const adjusted = applyAdjustmentsToActiveLayer(activeDocument, settings);
      commitDocChange('Apply Adjustments', adjusted);
    },
    [activeDocument, commitDocChange]
  );

  const handleAddLayer = () => {
    const newCanvas = createOffscreenCanvas(activeDocument.width, activeDocument.height);
    const newLayer: RasterLayer = {
      id: 'layer_' + Date.now(),
      name: `Layer ${activeDocument.layers.length + 1}`,
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      canvas: newCanvas,
    };

    commitDocChange('Add Layer', {
      ...activeDocument,
      layers: [...activeDocument.layers, newLayer],
      activeLayerId: newLayer.id,
    });
  };

  const handleRenameLayer = (id: string, newName: string) => {
    const updated = activeDocument.layers.map((l) => (l.id === id ? { ...l, name: newName } : l));
    commitDocChange('Rename Layer', {
      ...activeDocument,
      layers: updated,
    });
  };

  const handleDuplicateLayer = (id: string) => {
    const target = activeDocument.layers.find((l) => l.id === id);
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
        ...activeDocument,
        layers: [...activeDocument.layers, dupLayer],
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
        ...activeDocument,
        layers: [...activeDocument.layers, dupLayer],
        activeLayerId: dupLayer.id,
      });
    }
  };

  const handleDeleteLayer = useCallback(
    (id: string) => {
      const target = activeDocument.layers.find((l) => l.id === id);
      if (!target || target.isProtected || activeDocument.layers.length <= 1) return;

      const remaining = activeDocument.layers.filter((l) => l.id !== id);
      commitDocChange('Delete Layer', {
        ...activeDocument,
        layers: remaining,
        activeLayerId: remaining[remaining.length - 1].id,
      });
    },
    [activeDocument, commitDocChange]
  );

  const handleToggleVisibility = (id: string) => {
    const updated = activeDocument.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
    updateActivePage((prev) => ({ ...prev, layers: updated }));
  };

  const handleToggleLock = (id: string) => {
    const updated = activeDocument.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l));
    updateActivePage((prev) => ({ ...prev, layers: updated }));
  };

  const handleReorderLayer = (id: string, direction: 'up' | 'down') => {
    const index = activeDocument.layers.findIndex((l) => l.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= activeDocument.layers.length) return;

    const newLayers = [...activeDocument.layers];
    const [moved] = newLayers.splice(index, 1);
    newLayers.splice(targetIndex, 0, moved);

    commitDocChange('Reorder Layers', {
      ...activeDocument,
      layers: newLayers,
    });
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    const updated = activeDocument.layers.map((l) => (l.id === id ? { ...l, opacity } : l));
    updateActivePage((prev) => ({ ...prev, layers: updated }));
  };

  const handleUpdateLayerTransform = useCallback(
    (
      layerId: string,
      transform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
    ) => {
      const target = activeDocument.layers.find((l) => l.id === layerId);
      if (!target || target.locked || target.isProtected) return;

      const updatedLayers = activeDocument.layers.map((l) => {
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
        ...activeDocument,
        layers: updatedLayers,
      });
    },
    [activeDocument, commitDocChange]
  );

  const handleCommitTextEdit = (layerId: string, newText: string) => {
    const updatedLayers = activeDocument.layers.map((l) => {
      if (l.id === layerId && l.type === 'text') {
        return {
          ...l,
          text: newText,
        };
      }
      return l;
    });

    commitDocChange('Edit Text', {
      ...activeDocument,
      layers: updatedLayers,
    });
    setEditingTextLayerId(null);
  };

  const handleUpdateTextSettings = (newSettings: Partial<ToolSettings>) => {
    setToolSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (activeDocument.activeLayerId) {
        const activeL = activeDocument.layers.find((l) => l.id === activeDocument.activeLayerId);
        if (activeL && activeL.type === 'text' && !activeL.locked && !activeL.isProtected) {
          const updatedLayers = activeDocument.layers.map((l) => {
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
          updateActivePage((prev) => ({ ...prev, layers: updatedLayers }));
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
        setIsDrawingManualRegion(false);
        setManualRegionDraft(null);
        manualRegionStartRef.current = null;
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeDocument.activeLayerId) {
          handleDeleteLayer(activeDocument.activeLayerId);
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
  }, [handleUndo, handleRedo, handleSelectAll, handleDeselect, handleDeleteLayer, activeDocument.activeLayerId]);

  const handleCanvasPointerDown = (docX: number, docY: number) => {
    if (isDrawingManualRegion) {
      manualRegionStartRef.current = { x: docX, y: docY };
      setManualRegionDraft({ x: docX, y: docY, width: 0, height: 0 });
      return;
    }

    const activeLayer = activeDocument.layers.find((l) => l.id === activeDocument.activeLayerId);

    if (activeTool === 'eyedropper') {
      const sampledColor = sampleCanvasColor(activeDocument, docX, docY);
      setToolSettings((prev) => ({ ...prev, brushColor: sampledColor }));
      return;
    }

    if (activeTool === 'text') {
      const newTextLayer: TextLayer = {
        id: 'text_' + Date.now(),
        name: `Text ${activeDocument.layers.length + 1}`,
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
        ...activeDocument,
        layers: [...activeDocument.layers, newTextLayer],
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
      updateActivePage((prev) => ({ ...prev }));
      return;
    }

    if (activeTool === 'rectangle-select') {
      selectionStartRef.current = { x: docX, y: docY };
      updateActivePage((prev) => ({
        ...prev,
        selection: { x: docX, y: docY, width: 0, height: 0 },
      }));
      return;
    }

    if (activeTool === 'select') {
      lastDrawPointRef.current = { x: docX, y: docY };
      isDrawingRef.current = true;
    }
  };

  const handleCanvasPointerMove = (docX: number, docY: number) => {
    if (isDrawingManualRegion && manualRegionStartRef.current) {
      const start = manualRegionStartRef.current;
      const x = Math.min(start.x, docX);
      const y = Math.min(start.y, docY);
      const width = Math.abs(docX - start.x);
      const height = Math.abs(docY - start.y);

      setManualRegionDraft({ x, y, width, height });
      return;
    }

    const activeLayer = activeDocument.layers.find((l) => l.id === activeDocument.activeLayerId);

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
        updateActivePage((prev) => ({ ...prev }));
      }
      return;
    }

    if (activeTool === 'rectangle-select' && selectionStartRef.current) {
      const start = selectionStartRef.current;
      const x = Math.min(start.x, docX);
      const y = Math.min(start.y, docY);
      const width = Math.abs(docX - start.x);
      const height = Math.abs(docY - start.y);

      updateActivePage((prev) => ({
        ...prev,
        selection: { x, y, width, height },
      }));
      return;
    }

    if (activeTool === 'select' && isDrawingRef.current && lastDrawPointRef.current) {
      const dx = docX - lastDrawPointRef.current.x;
      const dy = docY - lastDrawPointRef.current.y;
      lastDrawPointRef.current = { x: docX, y: docY };

      const translatedDoc = translateActiveLayer(activeDocument, dx, dy);
      updateActivePage((prev) => ({
        ...prev,
        layers: translatedDoc.layers,
      }));
    }
  };

  const handleCanvasPointerUp = (docX?: number, docY?: number) => {
    if (isDrawingManualRegion && manualRegionStartRef.current) {
      const start = manualRegionStartRef.current;
      manualRegionStartRef.current = null;

      let finalDraft = manualRegionDraft;
      if (docX !== undefined && docY !== undefined) {
        const x = Math.min(start.x, docX);
        const y = Math.min(start.y, docY);
        const width = Math.abs(docX - start.x);
        const height = Math.abs(docY - start.y);
        finalDraft = { x, y, width, height };
      }

      setManualRegionDraft(null);
      setIsDrawingManualRegion(false);

      if (finalDraft && finalDraft.width >= 5 && finalDraft.height >= 5) {
        const targetBBox = {
          x: Math.round(finalDraft.x),
          y: Math.round(finalDraft.y),
          width: Math.round(finalDraft.width),
          height: Math.round(finalDraft.height),
        };

        const newManualRegion = {
          id: `manual_ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          pageId: activePage.id,
          text: '',
          confidence: 100,
          bbox: targetBBox,
          sourceWidth: activePage.width,
          sourceHeight: activePage.height,
          source: 'manual' as const,
        };

        setRightPanelTab('ocr');
        updateActivePage((prev) => {
          const updated = addOcrRegions(prev, [newManualRegion], 'merge');
          return selectOcrRegion(updated, newManualRegion.id);
        }, 'Add Manual Text Region');
      }
      return;
    }

    if ((activeTool === 'brush' || activeTool === 'eraser') && isDrawingRef.current) {
      isDrawingRef.current = false;
      lastDrawPointRef.current = null;
      commitDocChange(activeTool === 'brush' ? 'Brush Stroke' : 'Eraser Stroke', activeDocument);
      return;
    }

    if (activeTool === 'rectangle-select' && selectionStartRef.current) {
      selectionStartRef.current = null;
      if (activeDocument.selection && activeDocument.selection.width > 2 && activeDocument.selection.height > 2) {
        commitDocChange('Select Area', activeDocument);
      } else {
        updateActivePage((prev) => ({ ...prev, selection: null }));
      }
      return;
    }

    if (activeTool === 'select' && isDrawingRef.current) {
      isDrawingRef.current = false;
      lastDrawPointRef.current = null;
      commitDocChange('Move Layer', activeDocument);
    }
  };

  const activeLayerObj = activeDocument.layers.find((l) => l.id === activeDocument.activeLayerId) || null;

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
        onExport={handleExportSingle}
        onExportPDF={handleExportPDF}
        onExportZIP={handleExportZIP}
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
        documentName={`${project.name} - ${activePage.name}`}
        hasSelection={!!activeDocument.selection}
        onCropToSelection={handleCropToSelection}
        onOpenResizeCanvas={() => setIsResizeModalOpen(true)}
        onRotateDocument={handleRotateDocument}
        onFlipDocument={handleFlipDocument}
        onOpenAdjustments={() => setIsAdjustmentsModalOpen(true)}
        onOpenOcrPanel={() => setRightPanelTab('ocr')}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {exportMessage && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-1 flex items-center justify-between transition-all font-medium">
          <span>{exportMessage}</span>
          <button
            onClick={() => setExportMessage(null)}
            className="text-white/80 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <ToolOptionsBar
        activeTool={activeTool}
        settings={toolSettings}
        onSettingsChange={handleUpdateTextSettings}
        hasSelection={!!activeDocument.selection}
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
          document={activeDocument}
          viewport={viewport}
          activeTool={activeTool}
          isDrawingManualRegion={isDrawingManualRegion}
          manualRegionDraft={manualRegionDraft}
          onViewportChange={setViewport}
          onCursorMove={setCursorPos}
          onCanvasPointerDown={handleCanvasPointerDown}
          onCanvasPointerMove={handleCanvasPointerMove}
          onCanvasPointerUp={handleCanvasPointerUp}
          onSelectLayer={(id) =>
            updateActivePage((prev) => ({ ...prev, activeLayerId: id }))
          }
          onUpdateLayerTransform={handleUpdateLayerTransform}
          onEditTextLayer={(id) => setEditingTextLayerId(id)}
          editingTextLayerId={editingTextLayerId}
          onCommitTextEdit={handleCommitTextEdit}
          ocrRegions={activePage.ocrRegions}
          selectedOcrRegionId={activePage.selectedOcrRegionId}
          onSelectOcrRegion={handleSelectOcrRegion}
          onUpdateOcrRegionBBox={handleUpdateOcrBBox}
        />

        <RightPanels
          activeTool={activeTool}
          toolSettings={toolSettings}
          onSettingsChange={handleUpdateTextSettings}
          hasSelection={!!activeDocument.selection}
          onClearSelectionContent={handleClearSelectionContent}
          onFillSelectionContent={handleFillSelectionContent}
          onDeselect={handleDeselect}
          onCropToSelection={handleCropToSelection}
          layers={activeDocument.layers}
          activeLayerId={activeDocument.activeLayerId}
          onSelectLayer={(id) =>
            updateActivePage((prev) => ({ ...prev, activeLayerId: id }))
          }
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
          pages={project.pages}
          activePageId={project.activePageId}
          onSelectPage={handleSelectPage}
          onAddPage={handleAddPage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onReorderPage={handleReorderPage}
          activePage={activePage}
          isDrawingManualRegion={isDrawingManualRegion}
          onStartDrawManualRegion={() => {
            setIsDrawingManualRegion(true);
            setRightPanelTab('ocr');
          }}
          onCancelDrawManualRegion={() => {
            setIsDrawingManualRegion(false);
            setManualRegionDraft(null);
            manualRegionStartRef.current = null;
          }}
          ocrScope={ocrScope}
          onOcrScopeChange={setOcrScope}
          isCropOcrRunning={isCropOcrRunning}
          onUpdatePage={updateActivePage}
          onSelectOcrRegion={handleSelectOcrRegion}
          onRunOcrOnRegion={handleRunOcrOnRegion}
          onUpdateOcrText={handleUpdateOcrText}
          onUpdateOcrBBox={handleUpdateOcrBBox}
          onDeleteOcrRegion={handleDeleteOcrRegion}
          onClearAllOcrRegions={handleClearAllOcrRegions}
          activeTab={rightPanelTab}
          onTabChange={setRightPanelTab}
        />
      </div>

      <StatusBar
        zoomRatio={viewport.zoom}
        width={activeDocument.width}
        height={activeDocument.height}
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
        currentWidth={activeDocument.width}
        currentHeight={activeDocument.height}
        onResize={handleResizeCanvas}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}

export default App;
