import React, { useState } from 'react';
import { PropertiesPanel } from './PropertiesPanel';
import { LayersPanel } from './LayersPanel';
import { HistoryPanel } from './HistoryPanel';
import { PagePanel } from './PagePanel';
import { OcrPanel } from './OcrPanel';
import type { Layer, ToolSettings, ToolType, HistoryItem, Page } from '../types/editor';
import {
  Layers,
  Sliders,
  History,
  ChevronUp,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  ScanText,
} from 'lucide-react';

interface RightPanelsProps {
  activeTool: ToolType;
  toolSettings: ToolSettings;
  onSettingsChange: (newSettings: Partial<ToolSettings>) => void;
  hasSelection: boolean;
  onClearSelectionContent: () => void;
  onFillSelectionContent: () => void;
  onDeselect: () => void;
  onCropToSelection?: () => void;
  layers: Layer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onRenameLayer: (id: string, newName: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onAddLayer: () => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayer: (id: string, direction: 'up' | 'down') => void;
  onOpacityChange: (id: string, opacity: number) => void;
  historyItems: HistoryItem[];
  historyIndex: number;
  onJumpHistory: (index: number) => void;
  pages: Page[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPage: (fromIndex: number, toIndex: number) => void;
  activePage?: Page;
  isDrawingManualRegion?: boolean;
  onStartDrawManualRegion?: () => void;
  onCancelDrawManualRegion?: () => void;
  ocrScope?: 'composite' | string;
  onOcrScopeChange?: (scope: 'composite' | string) => void;
  isCropOcrRunning?: boolean;
  onUpdatePage?: (updater: (prevPage: Page) => Page, description?: string) => void;
  onSelectOcrRegion?: (regionId: string | null) => void;
  onRunOcrOnRegion?: (regionId: string) => void;
  onUpdateOcrText?: (regionId: string, newText: string) => void;
  onUpdateOcrBBox?: (
    regionId: string,
    newBBox: { x: number; y: number; width: number; height: number }
  ) => void;
  onDeleteOcrRegion?: (regionId: string) => void;
  onClearAllOcrRegions?: () => void;
  activeTab?: 'pages' | 'layers' | 'ocr' | 'properties' | 'history';
  onTabChange?: (tab: 'pages' | 'layers' | 'ocr' | 'properties' | 'history') => void;
}

export const RightPanels: React.FC<RightPanelsProps> = (props) => {
  const [internalTab, setInternalTab] = useState<'pages' | 'layers' | 'ocr' | 'properties' | 'history'>('pages');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeTab = props.activeTab || internalTab;
  const setActiveTab = (tab: 'pages' | 'layers' | 'ocr' | 'properties' | 'history') => {
    setInternalTab(tab);
    props.onTabChange?.(tab);
  };

  const activePageObj =
    props.activePage ||
    props.pages.find((p) => p.id === props.activePageId) ||
    props.pages[0];

  const ocrCount = activePageObj?.ocrRegions?.length || 0;

  return (
    <>
      {/* Mobile Drawer Trigger */}
      <div className="md:hidden absolute right-2 top-11 z-30">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-zinc-800/90 backdrop-blur border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium flex items-center space-x-1.5 active:bg-zinc-700"
        >
          <span>Panels</span>
          {isMobileOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Desktop Collapse Trigger (when collapsed) */}
      {isCollapsed && (
        <div className="hidden md:flex flex-col items-center bg-zinc-900 border-l border-zinc-800 py-2 px-1 z-20 shrink-0">
          <button
            onClick={() => setIsCollapsed(false)}
            title="Expand Panels"
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
          <div className="my-2 border-t border-zinc-800 w-full" />
          <button
            onClick={() => { setActiveTab('pages'); setIsCollapsed(false); }}
            title={`Pages (${props.pages?.length || 0})`}
            className={`p-2 rounded my-1 ${activeTab === 'pages' ? 'text-emerald-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setActiveTab('layers'); setIsCollapsed(false); }}
            title={`Layers (${props.layers?.length || 0})`}
            className={`p-2 rounded my-1 ${activeTab === 'layers' ? 'text-sky-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setActiveTab('ocr'); setIsCollapsed(false); }}
            title={`OCR (${ocrCount})`}
            className={`p-2 rounded my-1 ${activeTab === 'ocr' ? 'text-sky-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <ScanText className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setActiveTab('properties'); setIsCollapsed(false); }}
            title="Properties"
            className={`p-2 rounded my-1 ${activeTab === 'properties' ? 'text-sky-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setActiveTab('history'); setIsCollapsed(false); }}
            title="History"
            className={`p-2 rounded my-1 ${activeTab === 'history' ? 'text-sky-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      )}

      <aside
        className={`w-72 bg-zinc-900/95 border-l border-zinc-800 flex flex-col z-20 shrink-0 transition-all duration-200 ${
          isCollapsed ? 'hidden' : ''
        } ${
          isMobileOpen
            ? 'fixed inset-x-0 bottom-6 top-20 w-full z-40 bg-zinc-900/95 backdrop-blur-md shadow-2xl'
            : 'hidden md:flex'
        }`}
      >
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 select-none items-center overflow-x-auto no-scrollbar">
          <button
            onClick={() => setIsCollapsed(true)}
            title="Collapse Panels"
            className="hidden md:flex p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition items-center justify-center border-r border-zinc-800 shrink-0"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`flex-1 py-2.5 px-1.5 text-center text-xs font-semibold transition-all border-b-2 flex items-center justify-center space-x-1 shrink-0 ${
              activeTab === 'pages'
                ? 'border-emerald-500 text-emerald-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pages</span>
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-2.5 px-1.5 text-center text-xs font-semibold transition-all border-b-2 flex items-center justify-center space-x-1 shrink-0 ${
              activeTab === 'layers'
                ? 'border-sky-500 text-sky-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers</span>
          </button>
          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex-1 py-2.5 px-1.5 text-center text-xs font-semibold transition-all border-b-2 flex items-center justify-center space-x-1 shrink-0 ${
              activeTab === 'ocr'
                ? 'border-sky-500 text-sky-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ScanText className="w-3.5 h-3.5" />
            <span>OCR ({ocrCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 py-2.5 px-1.5 text-center text-xs font-semibold transition-all border-b-2 flex items-center justify-center space-x-1 shrink-0 ${
              activeTab === 'properties'
                ? 'border-sky-500 text-sky-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Props</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 px-1.5 text-center text-xs font-semibold transition-all border-b-2 flex items-center justify-center space-x-1 shrink-0 ${
              activeTab === 'history'
                ? 'border-sky-500 text-sky-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'pages' && (
            <PagePanel
              pages={props.pages || []}
              activePageId={props.activePageId || ''}
              onSelectPage={props.onSelectPage || (() => {})}
              onAddPage={props.onAddPage || (() => {})}
              onDuplicatePage={props.onDuplicatePage || (() => {})}
              onDeletePage={props.onDeletePage || (() => {})}
              onReorderPage={props.onReorderPage || (() => {})}
            />
          )}

          {activeTab === 'layers' && (
            <LayersPanel
              layers={props.layers}
              activeLayerId={props.activeLayerId}
              onSelectLayer={props.onSelectLayer}
              onRenameLayer={props.onRenameLayer}
              onToggleVisibility={props.onToggleVisibility}
              onToggleLock={props.onToggleLock}
              onAddLayer={props.onAddLayer}
              onDuplicateLayer={props.onDuplicateLayer}
              onDeleteLayer={props.onDeleteLayer}
              onReorderLayer={props.onReorderLayer}
              onOpacityChange={props.onOpacityChange}
            />
          )}

          {activeTab === 'ocr' && activePageObj && (
            <OcrPanel
              page={activePageObj}
              layers={props.layers}
              activeLayerId={props.activeLayerId}
              isDrawingManualRegion={props.isDrawingManualRegion}
              onStartDrawManualRegion={props.onStartDrawManualRegion}
              onCancelDrawManualRegion={props.onCancelDrawManualRegion}
              scope={props.ocrScope}
              onScopeChange={props.onOcrScopeChange}
              isCropOcrRunning={props.isCropOcrRunning}
              onUpdatePage={props.onUpdatePage || (() => {})}
              onSelectOcrRegion={props.onSelectOcrRegion || (() => {})}
              onRunOcrOnRegion={props.onRunOcrOnRegion}
              onUpdateText={props.onUpdateOcrText || (() => {})}
              onUpdateBBox={props.onUpdateOcrBBox || (() => {})}
              onDeleteRegion={props.onDeleteOcrRegion || (() => {})}
              onClearAllRegions={props.onClearAllOcrRegions || (() => {})}
            />
          )}

          {activeTab === 'properties' && (
            <PropertiesPanel
              activeTool={props.activeTool}
              settings={props.toolSettings}
              onSettingsChange={props.onSettingsChange}
              hasSelection={props.hasSelection}
              onClearSelectionContent={props.onClearSelectionContent}
              onFillSelectionContent={props.onFillSelectionContent}
              onDeselect={props.onDeselect}
              onCropToSelection={props.onCropToSelection}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPanel
              items={props.historyItems}
              currentIndex={props.historyIndex}
              onJumpTo={props.onJumpHistory}
            />
          )}
        </div>
      </aside>
    </>
  );
};
