import React from 'react';

interface StatusBarProps {
  zoomRatio: number;
  width: number;
  height: number;
  cursorPos: { x: number; y: number } | null;
  activeTool: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  zoomRatio,
  width,
  height,
  cursorPos,
  activeTool,
}) => {
  return (
    <footer className="h-6 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-400 px-3 flex items-center justify-between select-none shrink-0 z-20 font-mono">
      <div className="flex items-center space-x-4">
        <span>
          Zoom: <strong className="text-zinc-200">{Math.round(zoomRatio * 100)}%</strong>
        </span>
        <span>
          Doc: <strong className="text-zinc-200">{width} × {height} px</strong>
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {cursorPos ? (
          <span>
            X: <strong className="text-zinc-200">{Math.round(cursorPos.x)}</strong> Y:{' '}
            <strong className="text-zinc-200">{Math.round(cursorPos.y)}</strong> px
          </span>
        ) : (
          <span>Canvas Area</span>
        )}
        <span className="capitalize text-sky-400">Tool: {activeTool}</span>
      </div>
    </footer>
  );
};
