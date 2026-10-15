import React from 'react';
import type { ToolType, ToolSettings } from '../types/editor';

interface PropertiesPanelProps {
  activeTool: ToolType;
  settings: ToolSettings;
  onSettingsChange: (newSettings: Partial<ToolSettings>) => void;
  hasSelection: boolean;
  onClearSelectionContent: () => void;
  onFillSelectionContent: () => void;
  onDeselect: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  activeTool,
  settings,
  onSettingsChange,
  hasSelection,
  onClearSelectionContent,
  onFillSelectionContent,
  onDeselect,
}) => {
  return (
    <div className="p-3 text-xs text-zinc-300 space-y-4 select-none">
      <div className="font-semibold text-zinc-100 uppercase tracking-wider text-[11px] border-b border-zinc-800 pb-1.5 flex justify-between items-center">
        <span>Tool Properties</span>
        <span className="text-sky-400 capitalize font-mono text-[10px]">{activeTool}</span>
      </div>

      {activeTool === 'brush' && (
        <div className="space-y-3">
          <div>
            <label className="block text-zinc-400 mb-1">Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings.brushColor}
                onChange={(e) => onSettingsChange({ brushColor: e.target.value })}
                className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 cursor-pointer"
              />
              <input
                type="text"
                value={settings.brushColor}
                onChange={(e) => onSettingsChange({ brushColor: e.target.value })}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 font-mono text-[11px] text-zinc-200"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Size</span>
              <span className="font-mono text-zinc-200">{settings.brushSize} px</span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              value={settings.brushSize}
              onChange={(e) => onSettingsChange({ brushSize: Number(e.target.value) })}
              className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Opacity</span>
              <span className="font-mono text-zinc-200">{Math.round(settings.brushOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={settings.brushOpacity}
              onChange={(e) => onSettingsChange({ brushOpacity: Number(e.target.value) })}
              className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Hardness</span>
              <span className="font-mono text-zinc-200">{Math.round(settings.brushHardness * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.brushHardness}
              onChange={(e) => onSettingsChange({ brushHardness: Number(e.target.value) })}
              className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded"
            />
          </div>
        </div>
      )}

      {activeTool === 'eraser' && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Eraser Size</span>
              <span className="font-mono text-zinc-200">{settings.eraserSize} px</span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              value={settings.eraserSize}
              onChange={(e) => onSettingsChange({ eraserSize: Number(e.target.value) })}
              className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Eraser Opacity</span>
              <span className="font-mono text-zinc-200">{Math.round(settings.eraserOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={settings.eraserOpacity}
              onChange={(e) => onSettingsChange({ eraserOpacity: Number(e.target.value) })}
              className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded"
            />
          </div>
        </div>
      )}

      {activeTool === 'rectangle-select' && (
        <div className="space-y-3">
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Drag across canvas to create a marquee selection box.
          </p>
          {hasSelection ? (
            <div className="space-y-2 pt-1">
              <button
                onClick={onClearSelectionContent}
                className="w-full bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-200 py-1.5 rounded transition"
              >
                Clear Selected Area
              </button>
              <button
                onClick={onFillSelectionContent}
                className="w-full bg-sky-900/40 hover:bg-sky-800/60 border border-sky-700/50 text-sky-200 py-1.5 rounded transition"
              >
                Fill Area with Color
              </button>
              <button
                onClick={onDeselect}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 rounded transition"
              >
                Deselect (Esc)
              </button>
            </div>
          ) : (
            <div className="text-zinc-500 italic text-[11px]">No active selection.</div>
          )}
        </div>
      )}

      {['select', 'hand', 'zoom'].includes(activeTool) && (
        <div className="text-zinc-400 text-[11px] leading-relaxed space-y-2">
          {activeTool === 'select' && (
            <p>Click & drag to move selected layer content around canvas.</p>
          )}
          {activeTool === 'hand' && (
            <p>Click & drag anywhere on the canvas to scroll/pan view.</p>
          )}
          {activeTool === 'zoom' && (
            <p>Click to zoom in. Hold Shift and click to zoom out.</p>
          )}
        </div>
      )}
    </div>
  );
};
