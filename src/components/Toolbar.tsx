import React from 'react';
import {
  Move,
  Paintbrush,
  Eraser,
  Type,
  Pipette,
  Square,
  Hand,
  ZoomIn,
} from 'lucide-react';
import type { ToolType } from '../types/editor';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  currentColor?: string;
  onColorChange?: (color: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  currentColor = '#000000',
  onColorChange,
}) => {
  const tools: { id: ToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Move / Select', shortcut: 'V', icon: <Move className="w-4 h-4" /> },
    { id: 'brush', label: 'Brush Tool', shortcut: 'B', icon: <Paintbrush className="w-4 h-4" /> },
    { id: 'eraser', label: 'Eraser Tool', shortcut: 'E', icon: <Eraser className="w-4 h-4" /> },
    { id: 'text', label: 'Text Tool', shortcut: 'T', icon: <Type className="w-4 h-4" /> },
    { id: 'eyedropper', label: 'Eyedropper Tool', shortcut: 'I', icon: <Pipette className="w-4 h-4" /> },
    { id: 'rectangle-select', label: 'Marquee Selection', shortcut: 'M', icon: <Square className="w-4 h-4" /> },
    { id: 'hand', label: 'Hand / Pan', shortcut: 'H', icon: <Hand className="w-4 h-4" /> },
    { id: 'zoom', label: 'Zoom Tool', shortcut: 'Z', icon: <ZoomIn className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-12 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-2 space-y-1.5 z-20 shrink-0 select-none">
      {tools.map((t) => {
        const isActive = activeTool === t.id;

        return (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition-all duration-150 relative group ${
              isActive
                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/30'
                : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
            }`}
          >
            {t.icon}
            <span className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-800 text-zinc-100 text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity border border-zinc-700/60 flex items-center gap-1.5">
              <span>{t.label}</span>
              <span className="text-zinc-400 font-mono text-[10px]">({t.shortcut})</span>
            </span>
          </button>
        );
      })}

      <div className="w-7 my-2 border-t border-zinc-800" />

      {/* Primary & Secondary Color Swatch */}
      <div className="relative w-8 h-8 flex items-center justify-center mt-1" title="Color Swatch">
        <input
          type="color"
          value={currentColor}
          onChange={(e) => onColorChange?.(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className="w-6 h-6 rounded border-2 border-zinc-300 shadow-md transition-transform hover:scale-105"
          style={{ backgroundColor: currentColor }}
        />
      </div>
    </aside>
  );
};
