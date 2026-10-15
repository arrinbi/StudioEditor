import React, { useState } from 'react';
import type { Page, Layer } from '../types/editor';
import type { OcrLanguage, OcrProgress } from '../services/ocrEngine';
import { runOcrEngine } from '../services/ocrEngine';
import { addOcrRegions, extractOcrSourceCanvas } from '../core/ocr';
import {
  ScanText,
  Trash2,
  Play,
  RefreshCw,
  AlertCircle,
  Globe,
  Layers as LayersIcon,
  Sparkles,
} from 'lucide-react';

interface OcrPanelProps {
  page: Page;
  layers: Layer[];
  activeLayerId?: string | null;
  onUpdatePage: (updater: (prevPage: Page) => Page, description?: string) => void;
  onSelectOcrRegion: (regionId: string | null) => void;
  onUpdateText: (regionId: string, newText: string) => void;
  onUpdateBBox: (
    regionId: string,
    newBBox: { x: number; y: number; width: number; height: number }
  ) => void;
  onDeleteRegion: (regionId: string) => void;
  onClearAllRegions: () => void;
}

export const OcrPanel: React.FC<OcrPanelProps> = ({
  page,
  layers,
  activeLayerId: _activeLayerId,
  onUpdatePage,
  onSelectOcrRegion,
  onUpdateText,
  onDeleteRegion,
  onClearAllRegions,
}) => {
  const [language, setLanguage] = useState<OcrLanguage>('eng+ind');
  const [scope, setScope] = useState<'composite' | string>('composite');
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ocrRegions = page.ocrRegions || [];
  const selectedRegionId = page.selectedOcrRegionId || null;

  const handleRunOcr = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress({ status: 'Starting OCR...', progress: 0 });

    try {
      const sourceCanvas = extractOcrSourceCanvas(
        page,
        scope === 'composite' ? null : scope
      );

      const results = await runOcrEngine(sourceCanvas, {
        lang: language,
        pageId: page.id,
        sourceWidth: page.width,
        sourceHeight: page.height,
        onProgress: (p) => setProgress(p),
      });

      onUpdatePage((prev) => addOcrRegions(prev, results, mode), 'Run OCR Engine');
      setProgress(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-200 select-none overflow-hidden">
      {/* OCR Header / Config */}
      <div className="p-3 border-b border-zinc-800 space-y-3 bg-zinc-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-semibold text-xs text-sky-400">
            <ScanText className="w-4 h-4" />
            <span>OCR Engine & Text Regions</span>
          </div>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
            {ocrRegions.length} {ocrRegions.length === 1 ? 'region' : 'regions'}
          </span>
        </div>

        {/* Configuration Grid */}
        <div className="space-y-2 text-xs">
          {/* Language Selection */}
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] text-zinc-400 flex items-center space-x-1 font-medium">
              <Globe className="w-3 h-3" />
              <span>Recognition Language</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as OcrLanguage)}
              disabled={isProcessing}
              className="bg-zinc-800 border border-zinc-700 rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
            >
              <option value="eng+ind">Indonesian & English (Combined)</option>
              <option value="ind">Indonesian Only (ind)</option>
              <option value="eng">English Only (eng)</option>
            </select>
          </div>

          {/* Scope Selection */}
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] text-zinc-400 flex items-center space-x-1 font-medium">
              <LayersIcon className="w-3 h-3" />
              <span>Target Source</span>
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              disabled={isProcessing}
              className="bg-zinc-800 border border-zinc-700 rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
            >
              <option value="composite">Full Page Composite Image</option>
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  Layer: {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Conflict Mode Selection */}
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] text-zinc-400 flex items-center space-x-1 font-medium">
              <Sparkles className="w-3 h-3" />
              <span>Results Action</span>
            </label>
            <div className="flex space-x-2">
              <label className="flex items-center space-x-1 text-[11px] cursor-pointer">
                <input
                  type="radio"
                  name="ocrMode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  disabled={isProcessing}
                  className="accent-sky-500"
                />
                <span>Replace Existing</span>
              </label>
              <label className="flex items-center space-x-1 text-[11px] cursor-pointer">
                <input
                  type="radio"
                  name="ocrMode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  disabled={isProcessing}
                  className="accent-sky-500"
                />
                <span>Merge / Append</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRunOcr}
          disabled={isProcessing}
          className="w-full py-2 px-3 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium text-xs flex items-center justify-center space-x-2 transition shadow"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Processing OCR...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run OCR Detection</span>
            </>
          )}
        </button>

        {/* Progress Bar */}
        {progress && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span className="truncate pr-2">{progress.status}</span>
              <span>{Math.round((progress.progress || 0) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-200"
                style={{ width: `${Math.round((progress.progress || 0) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-2 bg-rose-950/60 border border-rose-800/80 rounded text-rose-300 text-[11px] flex items-start space-x-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-rose-200">OCR Failed</p>
              <p className="text-[10px] opacity-90 break-words">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Region List Toolbar */}
      <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-950/80 flex justify-between items-center text-[11px]">
        <span className="text-zinc-400 font-medium">Detected Text Regions</span>
        {ocrRegions.length > 0 && (
          <button
            onClick={onClearAllRegions}
            disabled={isProcessing}
            className="text-zinc-400 hover:text-rose-400 flex items-center space-x-1 text-[10px] transition"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Region Items Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {ocrRegions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-500 space-y-2">
            <ScanText className="w-8 h-8 stroke-1 text-zinc-600" />
            <p className="text-xs">No OCR regions detected yet.</p>
            <p className="text-[10px] text-zinc-600 max-w-[200px]">
              Select language and click "Run OCR Detection" to extract speech bubbles and text regions.
            </p>
          </div>
        ) : (
          ocrRegions.map((region, index) => {
            const isSelected = region.id === selectedRegionId;
            return (
              <div
                key={region.id}
                onClick={() => onSelectOcrRegion(region.id)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500 shadow-lg'
                    : 'bg-zinc-800/60 border-zinc-700/80 hover:bg-zinc-800 hover:border-zinc-600'
                }`}
              >
                {/* Item Meta Bar */}
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        isSelected
                          ? 'bg-sky-500 text-white'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <span className="text-zinc-400 font-mono">
                      ({region.bbox.x}, {region.bbox.y}) {region.bbox.width}x{region.bbox.height}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-mono font-medium ${
                        region.confidence >= 80
                          ? 'text-emerald-400'
                          : region.confidence >= 50
                          ? 'text-amber-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {region.confidence}% conf
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRegion(region.id);
                      }}
                      title="Delete Region"
                      className="text-zinc-400 hover:text-rose-400 p-0.5 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Text Area Input */}
                <textarea
                  value={region.text}
                  onChange={(e) => onUpdateText(region.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded p-1.5 text-xs text-zinc-100 focus:outline-none focus:border-sky-500 font-sans leading-relaxed resize-y"
                  placeholder="Recognized text..."
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
