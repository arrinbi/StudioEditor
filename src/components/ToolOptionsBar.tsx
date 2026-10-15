import React from 'react';
import type { ToolType, ToolSettings } from '../types/editor';
import { Sliders, Trash2, PaintBucket, XSquare, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';

interface ToolOptionsBarProps {
  activeTool: ToolType;
  settings: ToolSettings;
  onSettingsChange: (newSettings: Partial<ToolSettings>) => void;
  hasSelection: boolean;
  onClearSelectionContent: () => void;
  onFillSelectionContent: () => void;
  onDeselect: () => void;
  onCropToSelection?: () => void;
}

export const ToolOptionsBar: React.FC<ToolOptionsBarProps> = ({
  activeTool,
  settings,
  onSettingsChange,
  hasSelection,
  onClearSelectionContent,
  onFillSelectionContent,
  onDeselect,
  onCropToSelection,
}) => {
  const fontFamilies = [
    'Arial',
    'Times New Roman',
    'Impact',
    'Comic Sans MS',
    'Courier New',
    'Georgia',
    'Verdana',
    'Trebuchet MS',
  ];

  return (
    <div className="bg-zinc-850 bg-zinc-900/90 border-b border-zinc-800 text-zinc-300 px-3 py-1 text-xs flex items-center space-x-4 overflow-x-auto select-none shrink-0 min-h-[32px] scrollbar-none z-20">
      <div className="flex items-center space-x-1.5 font-medium text-sky-400 capitalize pr-2 border-r border-zinc-800 shrink-0">
        <Sliders className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-300">{activeTool}</span>
      </div>

      {activeTool === 'brush' && (
        <div className="flex items-center space-x-4 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px]">Color:</span>
            <div className="flex items-center space-x-1">
              <input
                type="color"
                value={settings.brushColor}
                onChange={(e) => onSettingsChange({ brushColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
              />
              <span className="font-mono text-[10px] text-zinc-300 uppercase">{settings.brushColor}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px]">Size:</span>
            <input
              type="range"
              min="1"
              max="200"
              value={settings.brushSize}
              onChange={(e) => onSettingsChange({ brushSize: Number(e.target.value) })}
              className="w-20 accent-sky-500 h-1 rounded"
            />
            <span className="font-mono text-[10px] w-8 text-right">{settings.brushSize}px</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px]">Opacity:</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={settings.brushOpacity}
              onChange={(e) => onSettingsChange({ brushOpacity: Number(e.target.value) })}
              className="w-16 accent-sky-500 h-1 rounded"
            />
            <span className="font-mono text-[10px] w-8 text-right">{Math.round(settings.brushOpacity * 100)}%</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px]">Hardness:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.brushHardness}
              onChange={(e) => onSettingsChange({ brushHardness: Number(e.target.value) })}
              className="w-16 accent-sky-500 h-1 rounded"
            />
            <span className="font-mono text-[10px] w-8 text-right">{Math.round(settings.brushHardness * 100)}%</span>
          </div>
        </div>
      )}

      {activeTool === 'eraser' && (
        <div className="flex items-center space-x-4 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px]">Size:</span>
            <input
              type="range"
              min="1"
              max="200"
              value={settings.eraserSize}
              onChange={(e) => onSettingsChange({ eraserSize: Number(e.target.value) })}
              className="w-20 accent-sky-500 h-1 rounded"
            />
            <span className="font-mono text-[10px] w-8 text-right">{settings.eraserSize}px</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px]">Opacity:</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={settings.eraserOpacity}
              onChange={(e) => onSettingsChange({ eraserOpacity: Number(e.target.value) })}
              className="w-16 accent-sky-500 h-1 rounded"
            />
            <span className="font-mono text-[10px] w-8 text-right">{Math.round(settings.eraserOpacity * 100)}%</span>
          </div>
        </div>
      )}

      {activeTool === 'text' && (
        <div className="flex items-center space-x-4 shrink-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 text-[11px]">Font:</span>
            <select
              value={settings.fontFamily || 'Arial'}
              onChange={(e) => onSettingsChange({ fontFamily: e.target.value })}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-2 py-0.5 text-xs focus:outline-none"
            >
              {fontFamilies.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 text-[11px]">Size:</span>
            <input
              type="number"
              min="8"
              max="200"
              value={settings.fontSize || 24}
              onChange={(e) => onSettingsChange({ fontSize: Number(e.target.value) })}
              className="w-14 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-1.5 py-0.5 font-mono text-xs text-right"
            />
            <span className="text-zinc-400 text-[10px]">px</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 text-[11px]">Color:</span>
            <input
              type="color"
              value={settings.brushColor}
              onChange={(e) => onSettingsChange({ brushColor: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
            />
          </div>

          {/* Alignment */}
          <div className="flex items-center border border-zinc-700 rounded overflow-hidden">
            <button
              onClick={() => onSettingsChange({ textAlign: 'left' })}
              className={`p-1 transition ${
                (settings.textAlign || 'left') === 'left' ? 'bg-sky-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSettingsChange({ textAlign: 'center' })}
              className={`p-1 transition ${
                settings.textAlign === 'center' ? 'bg-sky-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSettingsChange({ textAlign: 'right' })}
              className={`p-1 transition ${
                settings.textAlign === 'right' ? 'bg-sky-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Styles */}
          <div className="flex items-center border border-zinc-700 rounded overflow-hidden">
            <button
              onClick={() => onSettingsChange({ textBold: !settings.textBold })}
              className={`p-1 transition ${
                settings.textBold ? 'bg-sky-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
              }`}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSettingsChange({ textItalic: !settings.textItalic })}
              className={`p-1 transition ${
                settings.textItalic ? 'bg-sky-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
              }`}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {activeTool === 'eyedropper' && (
        <div className="flex items-center space-x-3 shrink-0">
          <span className="text-zinc-400 text-[11px]">Sampled Color:</span>
          <div className="flex items-center space-x-1.5">
            <div
              className="w-4 h-4 rounded border border-zinc-600 shadow"
              style={{ backgroundColor: settings.brushColor }}
            />
            <span className="font-mono text-[11px] text-sky-400 uppercase font-semibold">{settings.brushColor}</span>
          </div>
          <span className="text-zinc-500 italic text-[11px] pr-2">Click anywhere on canvas to pick pixel color</span>
        </div>
      )}

      {activeTool === 'rectangle-select' && (
        <div className="flex items-center space-x-2 shrink-0">
          {hasSelection ? (
            <>
              {onCropToSelection && (
                <button
                  onClick={onCropToSelection}
                  className="px-2 py-0.5 rounded bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 text-emerald-200 text-[11px] flex items-center space-x-1"
                >
                  <span>Crop to Selection</span>
                </button>
              )}
              <button
                onClick={onClearSelectionContent}
                className="px-2 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-200 text-[11px] flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Selection</span>
              </button>
              <button
                onClick={onFillSelectionContent}
                className="px-2 py-0.5 rounded bg-sky-900/40 hover:bg-sky-800/60 border border-sky-700/50 text-sky-200 text-[11px] flex items-center space-x-1"
              >
                <PaintBucket className="w-3 h-3" />
                <span>Fill Selection</span>
              </button>
              <button
                onClick={onDeselect}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center space-x-1"
              >
                <XSquare className="w-3 h-3" />
                <span>Deselect</span>
              </button>
            </>
          ) : (
            <span className="text-zinc-500 italic text-[11px]">Drag on canvas to draw selection box</span>
          )}
        </div>
      )}

      {['select', 'hand', 'zoom'].includes(activeTool) && (
        <div className="text-zinc-400 text-[11px] shrink-0">
          {activeTool === 'select' && 'Click and drag canvas content to reposition or transform active layer.'}
          {activeTool === 'hand' && 'Click and drag to pan viewport around canvas.'}
          {activeTool === 'zoom' && 'Click to zoom in. Use zoom status bar controls for presets.'}
        </div>
      )}
    </div>
  );
};
