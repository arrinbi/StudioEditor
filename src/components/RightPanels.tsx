import React, { useState } from 'react';
import { PropertiesPanel } from './PropertiesPanel';
import { LayersPanel } from './LayersPanel';
import { HistoryPanel } from './HistoryPanel';
import type { Layer, ToolSettings, ToolType, HistoryItem } from '../types/editor';
import { Layers, Sliders, History, ChevronUp, ChevronDown, PanelRightClose, PanelRightOpen } from 'lucide-react';

interface RightPanelsProps {
  activeTool: ToolType;
  toolSettings: ToolSettings;
  onSettingsChange: (newSettings: Partial<ToolSettings>) => void;
  hasSelection: boolean;
  onClearSelectionContent: () => void;
  onFillSelectionContent: () => void;
  onDeselect: () => void;
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
}

export const RightPanels: React.FC<RightPanelsProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'properties' | 'history'>('layers');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
            onClick={() => { setActiveTab('layers'); setIsCollapsed(false); }}
            title={`Layers (${props.layers.length})`}
            className={`p-2 rounded my-1 ${activeTab === 'layers' ? 'text-sky-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Layers className="w-4 h-4" />
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
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 select-none items-center">
          <button
            onClick={() => setIsCollapsed(true)}
            title="Collapse Panels"
            className="hidden md:flex p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition items-center justify-center border-r border-zinc-800"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-2.5 text-center text-xs font-semibold transition-all border-b-2 flex items-center justify-center space-x-1.5 ${
              activeTab === 'layers'
                ? 'border-sky-500 text-sky-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers ({props.layers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 py-2.5 text-center text-xs font-semibold transition-all border-b-2 flex items-center justify-center space-x-1.5 ${
              activeTab === 'properties'
                ? 'border-sky-500 text-sky-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Properties</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-center text-xs font-semibold transition-all border-b-2 flex items-center justify-center space-x-1.5 ${
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

          {activeTab === 'properties' && (
            <PropertiesPanel
              activeTool={props.activeTool}
              settings={props.toolSettings}
              onSettingsChange={props.onSettingsChange}
              hasSelection={props.hasSelection}
              onClearSelectionContent={props.onClearSelectionContent}
              onFillSelectionContent={props.onFillSelectionContent}
              onDeselect={props.onDeselect}
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
