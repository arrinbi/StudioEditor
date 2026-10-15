import React, { useState } from 'react';
import type { Layer } from '../types/editor';

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
    <div className="flex flex-col h-full text-xs text-zinc-300 select-none">
      {activeLayer && (
        <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <span className="text-zinc-400">Layer Opacity</span>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={activeLayer.opacity}
              onChange={(e) => onOpacityChange(activeLayer.id, Number(e.target.value))}
              className="w-20 accent-sky-500 h-1 rounded bg-zinc-800"
            />
            <span className="font-mono text-[10px] w-8 text-right">
              {Math.round(activeLayer.opacity * 100)}%
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 p-1">
        {[...layers].reverse().map((layer) => {
          const isActive = layer.id === activeLayerId;
          const isEditing = layer.id === editingLayerId;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center justify-between px-2 py-2 rounded transition cursor-pointer my-0.5 ${
                isActive
                  ? 'bg-sky-900/40 border border-sky-600/50 text-white'
                  : 'hover:bg-zinc-800/60 text-zinc-300'
              }`}
            >
              <div className="flex items-center space-x-2 overflow-hidden flex-1 mr-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  className={`p-1 rounded hover:bg-zinc-700/60 ${
                    layer.visible ? 'text-zinc-200' : 'text-zinc-600'
                  }`}
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? '👁' : '🙈'}
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
                      className="font-medium truncate text-[11px] hover:text-sky-300"
                      title="Double click to rename"
                    >
                      {layer.name}
                    </span>
                  )}
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px] uppercase font-mono px-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {layer.type}
                    </span>
                    {layer.isProtected && (
                      <span className="text-[9px] text-amber-400 font-semibold">(Original)</span>
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
                  className="p-1 text-[10px] text-zinc-500 hover:text-zinc-200"
                  title="Rename Layer"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                  className={`p-1 text-[11px] ${layer.locked ? 'text-amber-400' : 'text-zinc-600'}`}
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            onClick={onAddLayer}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            title="Create New Layer"
          >
            ➕
          </button>
          {activeLayerId && (
            <button
              onClick={() => onDuplicateLayer(activeLayerId)}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              title="Duplicate Active Layer"
            >
              📋
            </button>
          )}
        </div>

        {activeLayerId && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onReorderLayer(activeLayerId, 'up')}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              title="Move Layer Up"
            >
              ▲
            </button>
            <button
              onClick={() => onReorderLayer(activeLayerId, 'down')}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              title="Move Layer Down"
            >
              ▼
            </button>
            <button
              disabled={activeLayer?.isProtected}
              onClick={() => onDeleteLayer(activeLayerId)}
              className="p-1.5 rounded bg-red-950/60 hover:bg-red-800 text-red-300 disabled:opacity-30 disabled:hover:bg-red-950/60"
              title="Delete Layer"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
