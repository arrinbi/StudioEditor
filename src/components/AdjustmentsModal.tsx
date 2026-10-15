import React, { useState, useEffect, useRef } from 'react';
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import type { Layer } from '../types/editor';
import {
  type AdjustmentSettings,
  defaultAdjustmentSettings,
  applyAdjustmentsToLayer,
} from '../core/adjustments';

interface AdjustmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayer: Layer | null;
  onApply: (settings: AdjustmentSettings) => void;
}

export const AdjustmentsModal: React.FC<AdjustmentsModalProps> = ({
  isOpen,
  onClose,
  activeLayer,
  onApply,
}) => {
  const [settings, setSettings] = useState<AdjustmentSettings>(defaultAdjustmentSettings);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSettings(defaultAdjustmentSettings);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeLayer || !previewCanvasRef.current) return;

    const previewCanvas = previewCanvasRef.current;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    const previewWidth = 320;
    const previewHeight = 200;
    previewCanvas.width = previewWidth;
    previewCanvas.height = previewHeight;

    ctx.clearRect(0, 0, previewWidth, previewHeight);

    // Render checkered background
    const square = 8;
    for (let x = 0; x < previewWidth; x += square) {
      for (let y = 0; y < previewHeight; y += square) {
        ctx.fillStyle = (x / square + y / square) % 2 === 0 ? '#27272a' : '#18181b';
        ctx.fillRect(x, y, square, square);
      }
    }

    const adjustedLayer = applyAdjustmentsToLayer(activeLayer, settings);

    if (adjustedLayer.type === 'raster' || adjustedLayer.type === 'mask') {
      const srcCanvas = adjustedLayer.canvas;
      const scale = Math.min(previewWidth / srcCanvas.width, previewHeight / srcCanvas.height);
      const drawW = srcCanvas.width * scale;
      const drawH = srcCanvas.height * scale;
      const drawX = (previewWidth - drawW) / 2;
      const drawY = (previewHeight - drawH) / 2;

      ctx.drawImage(srcCanvas, drawX, drawY, drawW, drawH);
    } else if (adjustedLayer.type === 'image') {
      const scale = Math.min(previewWidth / adjustedLayer.width, previewHeight / adjustedLayer.height);
      const drawW = adjustedLayer.width * scale;
      const drawH = adjustedLayer.height * scale;
      const drawX = (previewWidth - drawW) / 2;
      const drawY = (previewHeight - drawH) / 2;

      ctx.drawImage(adjustedLayer.image, drawX, drawY, drawW, drawH);
    }
  }, [isOpen, activeLayer, settings]);

  if (!isOpen) return null;

  const isLayerLocked = activeLayer?.locked || activeLayer?.isProtected;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center space-x-2 text-zinc-100 font-medium text-sm">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <span>Image Adjustments</span>
            {activeLayer && (
              <span className="text-xs text-zinc-400 font-normal">({activeLayer.name})</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition rounded p-1 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[80vh] text-xs text-zinc-300">
          {isLayerLocked && (
            <div className="p-2 rounded bg-amber-900/30 border border-amber-700/50 text-amber-200 text-xs">
              This layer is locked or protected and cannot be adjusted directly. Unlock or duplicate it to apply adjustments.
            </div>
          )}

          {/* Preview Canvas */}
          <div className="flex flex-col items-center space-y-1">
            <div className="text-[11px] text-zinc-400 font-medium">Real-Time Preview</div>
            <canvas
              ref={previewCanvasRef}
              className="rounded border border-zinc-800 shadow-inner bg-zinc-950"
            />
          </div>

          <div className="space-y-3 pt-2">
            {/* Brightness */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300">Brightness</span>
                <span className="font-mono text-sky-400">{settings.brightness}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={settings.brightness}
                onChange={(e) =>
                  setSettings({ ...settings, brightness: Number(e.target.value) })
                }
                className="w-full accent-sky-500 h-1.5 rounded bg-zinc-800"
                disabled={isLayerLocked}
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300">Contrast</span>
                <span className="font-mono text-sky-400">{settings.contrast}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={settings.contrast}
                onChange={(e) =>
                  setSettings({ ...settings, contrast: Number(e.target.value) })
                }
                className="w-full accent-sky-500 h-1.5 rounded bg-zinc-800"
                disabled={isLayerLocked}
              />
            </div>

            {/* Hue */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300">Hue</span>
                <span className="font-mono text-sky-400">{settings.hue}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={settings.hue}
                onChange={(e) => setSettings({ ...settings, hue: Number(e.target.value) })}
                className="w-full accent-sky-500 h-1.5 rounded bg-zinc-800"
                disabled={isLayerLocked}
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300">Saturation</span>
                <span className="font-mono text-sky-400">{settings.saturation}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={settings.saturation}
                onChange={(e) =>
                  setSettings({ ...settings, saturation: Number(e.target.value) })
                }
                className="w-full accent-sky-500 h-1.5 rounded bg-zinc-800"
                disabled={isLayerLocked}
              />
            </div>

            {/* Invert */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.invert}
                  onChange={(e) => setSettings({ ...settings, invert: e.target.checked })}
                  className="rounded accent-sky-500 bg-zinc-800 border-zinc-700"
                  disabled={isLayerLocked}
                />
                <span className="text-zinc-200">Invert Colors</span>
              </label>

              <button
                type="button"
                onClick={() => setSettings(defaultAdjustmentSettings)}
                className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
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
            disabled={isLayerLocked}
            onClick={() => {
              onApply(settings);
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition disabled:opacity-50"
          >
            Apply Adjustments
          </button>
        </div>
      </div>
    </div>
  );
};
