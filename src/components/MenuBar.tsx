import React, { useState } from 'react';
import {
  FolderOpen,
  FilePlus,
  Save,
  Download,
  Undo2,
  Redo2,
  Layers,
  Maximize2,
  Sparkles,
} from 'lucide-react';

interface MenuBarProps {
  onNewDocument: () => void;
  onOpenImage: () => void;
  onExport: (format: 'png' | 'jpg') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSelectAll: () => void;
  onDeselect: () => void;
  onAddLayer: () => void;
  onFitScreen: () => void;
  onZoom100: () => void;
  documentName: string;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onNewDocument,
  onOpenImage,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSelectAll,
  onDeselect,
  onAddLayer,
  onFitScreen,
  onZoom100,
  documentName,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleMenu = (name: string) => {
    setActiveMenu(activeMenu === name ? null : name);
  };

  const closeMenus = () => setActiveMenu(null);

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 text-zinc-200 text-xs select-none flex flex-col z-30">
      <div className="flex items-center justify-between px-2 h-9 border-b border-zinc-800/80">
        <div className="flex items-center space-x-1">
          <div className="flex items-center space-x-1.5 px-2 py-1 text-sky-400 font-bold text-sm tracking-wide">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">ScanlationStudio</span>
          </div>

          <nav className="flex items-center space-x-0.5 relative">
            <div className="relative">
              <button
                onClick={() => toggleMenu('file')}
                className={`px-2.5 py-1 rounded hover:bg-zinc-800 transition ${
                  activeMenu === 'file' ? 'bg-zinc-800 text-white' : ''
                }`}
              >
                File
              </button>
              {activeMenu === 'file' && (
                <div
                  className="absolute left-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 z-50"
                  onClick={closeMenus}
                >
                  <button
                    onClick={onNewDocument}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>New Canvas...</span>
                    </span>
                    <span className="text-zinc-400 text-[10px]">Ctrl+N</span>
                  </button>
                  <button
                    onClick={onOpenImage}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Open Image...</span>
                    </span>
                    <span className="text-zinc-400 text-[10px]">Ctrl+O</span>
                  </button>
                  <div className="my-1 border-t border-zinc-700" />
                  <button
                    onClick={() => onExport('png')}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 flex items-center space-x-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export PNG</span>
                  </button>
                  <button
                    onClick={() => onExport('jpg')}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 flex items-center space-x-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Export JPEG</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => toggleMenu('edit')}
                className={`px-2.5 py-1 rounded hover:bg-zinc-800 transition ${
                  activeMenu === 'edit' ? 'bg-zinc-800 text-white' : ''
                }`}
              >
                Edit
              </button>
              {activeMenu === 'edit' && (
                <div
                  className="absolute left-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 z-50"
                  onClick={closeMenus}
                >
                  <button
                    disabled={!canUndo}
                    onClick={onUndo}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </span>
                    <span className="text-zinc-400 text-[10px]">Ctrl+Z</span>
                  </button>
                  <button
                    disabled={!canRedo}
                    onClick={onRedo}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <Redo2 className="w-3.5 h-3.5" />
                      <span>Redo</span>
                    </span>
                    <span className="text-zinc-400 text-[10px]">Ctrl+Y</span>
                  </button>
                  <div className="my-1 border-t border-zinc-700" />
                  <button
                    onClick={onSelectAll}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 flex items-center space-x-2"
                  >
                    <span>Select All</span>
                  </button>
                  <button
                    onClick={onDeselect}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 flex items-center space-x-2"
                  >
                    <span>Deselect</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => toggleMenu('layer')}
                className={`px-2.5 py-1 rounded hover:bg-zinc-800 transition ${
                  activeMenu === 'layer' ? 'bg-zinc-800 text-white' : ''
                }`}
              >
                Layer
              </button>
              {activeMenu === 'layer' && (
                <div
                  className="absolute left-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 z-50"
                  onClick={closeMenus}
                >
                  <button
                    onClick={onAddLayer}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 flex items-center space-x-2"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>New Raster Layer</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => toggleMenu('view')}
                className={`px-2.5 py-1 rounded hover:bg-zinc-800 transition ${
                  activeMenu === 'view' ? 'bg-zinc-800 text-white' : ''
                }`}
              >
                View
              </button>
              {activeMenu === 'view' && (
                <div
                  className="absolute left-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 z-50"
                  onClick={closeMenus}
                >
                  <button
                    onClick={onFitScreen}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 flex items-center space-x-2"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Fit on Screen</span>
                  </button>
                  <button
                    onClick={onZoom100}
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 flex items-center space-x-2"
                  >
                    <span>100% Zoom</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="text-zinc-400 text-[11px] truncate max-w-[150px] sm:max-w-xs font-mono">
          {documentName}
        </div>
      </div>
    </header>
  );
};
