import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Link as LinkIcon, Unlink } from 'lucide-react';
import type { AnchorPosition } from '../core/documentOps';

interface ResizeCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
  onResize: (width: number, height: number, anchor: AnchorPosition) => void;
}

export const ResizeCanvasModal: React.FC<ResizeCanvasModalProps> = ({
  isOpen,
  onClose,
  currentWidth,
  currentHeight,
  onResize,
}) => {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [anchor, setAnchor] = useState<AnchorPosition>('center');
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setWidth(currentWidth);
      setHeight(currentHeight);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentWidth, currentHeight]);

  if (!isOpen) return null;

  const handleWidthChange = (val: number) => {
    const newW = Math.max(1, val);
    setWidth(newW);
    if (keepAspectRatio && currentWidth > 0) {
      const ratio = currentHeight / currentWidth;
      setHeight(Math.max(1, Math.round(newW * ratio)));
    }
  };

  const handleHeightChange = (val: number) => {
    const newH = Math.max(1, val);
    setHeight(newH);
    if (keepAspectRatio && currentHeight > 0) {
      const ratio = currentWidth / currentHeight;
      setWidth(Math.max(1, Math.round(newH * ratio)));
    }
  };

  const anchorGrid: { id: AnchorPosition; label: string }[] = [
    { id: 'top-left', label: '↖' },
    { id: 'top-center', label: '↑' },
    { id: 'top-right', label: '↗' },
    { id: 'middle-left', label: '←' },
    { id: 'center', label: '•' },
    { id: 'middle-right', label: '→' },
    { id: 'bottom-left', label: '↙' },
    { id: 'bottom-center', label: '↓' },
    { id: 'bottom-right', label: '↘' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center space-x-2 text-zinc-100 font-medium text-sm">
            <Maximize2 className="w-4 h-4 text-sky-400" />
            <span>Resize Canvas</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition rounded p-1 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs text-zinc-300">
          <div className="text-zinc-400 text-[11px]">
            Current dimensions: <span className="font-mono text-zinc-200">{currentWidth} x {currentHeight} px</span>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-zinc-400 mb-1">Width (px)</label>
              <input
                type="number"
                min="1"
                max="10000"
                value={width}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 font-mono text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Height (px)</label>
              <input
                type="number"
                min="1"
                max="10000"
                value={height}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 font-mono text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setKeepAspectRatio(!keepAspectRatio)}
              className="flex items-center space-x-1.5 text-zinc-400 hover:text-zinc-200 transition text-xs"
            >
              {keepAspectRatio ? (
                <>
                  <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Lock Aspect Ratio</span>
                </>
              ) : (
                <>
                  <Unlink className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Aspect Ratio Unlocked</span>
                </>
              )}
            </button>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1.5">Anchor Point</label>
            <div className="grid grid-cols-3 gap-1.5 w-36 mx-auto bg-zinc-950 p-1.5 rounded border border-zinc-800">
              {anchorGrid.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAnchor(item.id)}
                  className={`w-10 h-10 rounded text-sm font-semibold flex items-center justify-center transition ${
                    anchor === item.id
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                  title={`Anchor: ${item.id}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 px-4 py-3 bg-zinc-950/60 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-zinc-300 hover:bg-zinc-800 text-xs transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onResize(width, height, anchor);
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition"
          >
            Resize Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
