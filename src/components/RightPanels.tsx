import React, { useState } from 'react';
import { PropertiesPanel } from './PropertiesPanel';
import { LayersPanel } from './LayersPanel';
import { HistoryPanel } from './HistoryPanel';
import type { Layer, ToolSettings, ToolType, HistoryItem } from '../types/editor';

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

  return (
    <>
      <div className="md:hidden absolute right-2 top-11 z-30">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 px-2.5 py-1 rounded shadow text-xs flex items-center space-x-1"
        >
          <span>Panels</span>
          <span className="text-[10px]">{isMobileOpen ? '▼' : '▲'}</span>
        </button>
      </div>

      <aside
        className={`w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shrink-0 transition-all duration-200 ${
          isMobileOpen
            ? 'fixed inset-x-0 bottom-6 top-20 w-full z-40 bg-zinc-900/95 backdrop-blur'
            : 'hidden md:flex'
        }`}
      >
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 select-none">
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-2 text-center text-xs font-medium transition border-b-2 ${
              activeTab === 'layers'
                ? 'border-sky-500 text-sky-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Layers ({props.layers.length})
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 py-2 text-center text-xs font-medium transition border-b-2 ${
              activeTab === 'properties'
                ? 'border-sky-500 text-sky-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-center text-xs font-medium transition border-b-2 ${
              activeTab === 'history'
                ? 'border-sky-500 text-sky-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            History ({props.historyItems.length})
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
