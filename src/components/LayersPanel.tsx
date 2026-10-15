import React, { useState } from 'react';
import type { Layer } from '../types/editor';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  ShieldAlert,
} from 'lucide-react';

interface LayersPanelProps {
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
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onRenameLayer,
  onToggleVisibility,
  onToggleLock,
  onAddLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onReorderLayer,
  onOpacityChange,
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const startRename = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleRenameSubmit = (id: string) => {
    if (editingName.trim()) {
      onRenameLayer(id, editingName.trim());
    }
    setEditingLayerId(null);
  };

  return (
    <div className="flex flex-col h-full text-xs text-zinc-300 select-none bg-zinc-900">
      {activeLayer && (
        <div className="p-2 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between shrink-0">
          <span className="text-zinc-400 font-medium text-[11px]">Opacity</span>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={activeLayer.opacity}
              onChange={(e) => onOpacityChange(activeLayer.id, Number(e.target.value))}
              className="w-24 accent-sky-500 h-1.5 rounded bg-zinc-800 cursor-pointer"
            />
            <span className="font-mono text-[10px] w-8 text-right text-zinc-200">
              {Math.round(activeLayer.opacity * 100)}%
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 p-1 space-y-1">
        {[...layers].reverse().map((layer) => {
          const isActive = layer.id === activeLayerId;
          const isEditing = layer.id === editingLayerId;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-950/60 border border-sky-500/60 text-white shadow-sm'
                  : 'hover:bg-zinc-800/60 text-zinc-300 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2 overflow-hidden flex-1 mr-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  className={`p-1 rounded hover:bg-zinc-700/60 transition ${
                    layer.visible ? 'text-zinc-200' : 'text-zinc-600'
                  }`}
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                <div className="flex flex-col truncate flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRenameSubmit(layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(layer.id);
                        if (e.key === 'Escape') setEditingLayerId(null);
                      }}
                      autoFocus
                      className="bg-zinc-800 text-white border border-sky-500 rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startRename(layer)}
                      className="font-medium truncate text-[11px] hover:text-sky-300 transition-colors"
                      title="Double click to rename"
                    >
                      {layer.name}
                    </span>
                  )}
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[9px] uppercase font-mono px-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/80">
                      {layer.type}
                    </span>
                    {layer.isProtected && (
                      <span className="text-[9px] text-amber-400 font-medium flex items-center gap-0.5">
                        <ShieldAlert className="w-3 h-3 inline" /> Protected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(layer);
                  }}
                  className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800"
                  title="Rename Layer"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                  className={`p-1 rounded hover:bg-zinc-800 ${
                    layer.locked ? 'text-amber-400' : 'text-zinc-600'
                  }`}
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1">
          <button
            onClick={onAddLayer}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
            title="Create New Layer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {activeLayerId && (
            <button
              onClick={() => onDuplicateLayer(activeLayerId)}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
              title="Duplicate Active Layer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeLayerId && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onReorderLayer(activeLayerId, 'up')}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
              title="Move Layer Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onReorderLayer(activeLayerId, 'down')}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
              title="Move Layer Down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={activeLayer?.isProtected}
              onClick={() => onDeleteLayer(activeLayerId)}
              className="p-1.5 rounded bg-red-950/60 hover:bg-red-800 text-red-300 disabled:opacity-30 disabled:hover:bg-red-950/60 transition"
              title="Delete Layer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
