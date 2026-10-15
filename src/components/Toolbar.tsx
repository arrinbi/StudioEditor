import React from 'react';
import type { ToolType } from '../types/editor';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onSelectTool }) => {
  const tools: { id: ToolType; label: string; iconStr: string }[] = [
    { id: 'select', label: 'Move / Select (V)', iconStr: '↖' },
    { id: 'brush', label: 'Brush Tool (B)', iconStr: '✏' },
    { id: 'eraser', label: 'Eraser Tool (E)', iconStr: '⌫' },
    { id: 'rectangle-select', label: 'Marquee Selection (M)', iconStr: '⬚' },
    { id: 'hand', label: 'Hand / Pan (H)', iconStr: '✋' },
    { id: 'zoom', label: 'Zoom Tool (Z)', iconStr: '🔍' },
  ];

  return (
    <aside className="w-12 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-2 space-y-1 z-20 shrink-0">
      {tools.map((t) => {
        const isActive = activeTool === t.id;

        return (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            title={t.label}
            className={`w-9 h-9 rounded flex items-center justify-center text-lg transition-colors relative group ${
              isActive
                ? 'bg-sky-600 text-white shadow'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <span>{t.iconStr}</span>
            <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-100 text-[11px] rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
              {t.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
};
