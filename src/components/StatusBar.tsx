import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface StatusBarProps {
  zoomRatio: number;
  width: number;
  height: number;
  cursorPos: { x: number; y: number } | null;
  activeTool: string;
  onFitScreen?: () => void;
  onZoom100?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  zoomRatio,
  width,
  height,
  cursorPos,
  activeTool,
  onFitScreen,
  onZoom100,
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <footer className="h-7 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-400 px-3 flex items-center justify-between select-none shrink-0 z-20 font-mono">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="hover:text-zinc-100 p-0.5 transition"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="min-w-[36px] text-center font-bold text-zinc-200">
            {Math.round(zoomRatio * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="hover:text-zinc-100 p-0.5 transition"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={onFitScreen}
          title="Fit Canvas to Screen"
          className="flex items-center space-x-1 hover:text-sky-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-0.5 rounded transition text-zinc-300"
        >
          <Maximize2 className="w-3 h-3" />
          <span className="hidden sm:inline">Fit Screen</span>
        </button>

        <button
          onClick={onZoom100}
          title="Reset Zoom to 100%"
          className="flex items-center space-x-1 hover:text-sky-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-0.5 rounded transition text-zinc-300"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">100%</span>
        </button>

        <span className="hidden md:inline border-l border-zinc-800 pl-3">
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
        <span className="capitalize text-sky-400 font-semibold">Tool: {activeTool}</span>
      </div>
    </footer>
  );
};
