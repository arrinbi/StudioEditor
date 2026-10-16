import React, { useState, useRef } from 'react';
import type { Page, Layer } from '../types/editor';
import type { OcrProgress } from '../services/ocrEngine';
import type { OcrProviderConfig } from '../services/aiSettings';
import { runOcrEngine } from '../services/ocrEngine';
import { addOcrRegions, extractOcrSourceCanvas } from '../core/ocr';
import { getOcrConfig } from '../services/aiSettings';
import { SettingsModal } from './SettingsModal';
import {
  ScanText,
  Trash2,
  Play,
  RefreshCw,
  AlertCircle,
  Globe,
  Layers as LayersIcon,
  Sparkles,
  Settings,
  XCircle,
  RotateCcw,
  Info,
  PlusCircle,
  MousePointerClick,
} from 'lucide-react';

interface OcrPanelProps {
  page: Page;
  layers: Layer[];
  activeLayerId?: string | null;
  isDrawingManualRegion?: boolean;
  onStartDrawManualRegion?: () => void;
  onCancelDrawManualRegion?: () => void;
  scope?: 'composite' | string;
  onScopeChange?: (scope: 'composite' | string) => void;
  isCropOcrRunning?: boolean;
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
  isDrawingManualRegion = false,
  onStartDrawManualRegion,
  onCancelDrawManualRegion,
  scope: externalScope,
  onScopeChange,
  isCropOcrRunning = false,
  onUpdatePage,
  onSelectOcrRegion,
  onUpdateText,
  onDeleteRegion,
  onClearAllRegions,
}) => {
  const [config, setConfig] = useState<OcrProviderConfig>(() => getOcrConfig());
  const [internalScope, setInternalScope] = useState<'composite' | string>('composite');
  const scope = externalScope !== undefined ? externalScope : internalScope;
  const setScope = (val: 'composite' | string) => {
    setInternalScope(val);
    onScopeChange?.(val);
  };

  const [mode, setMode] = useState<'replace' | 'merge'>('replace');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const ocrRegions = page.ocrRegions || [];
  const selectedRegionId = page.selectedOcrRegionId || null;

  const estimatedSegments = Math.max(
    1,
    Math.ceil((page.height - config.overlapHeight) / (config.maxSegmentHeight - config.overlapHeight))
  );

  const handleRunOcr = async (retrySegIdx?: number) => {
    setIsProcessing(true);
    setError(null);
    setProgress({ status: 'Preparing canvas and segments...', progress: 0.02 });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const sourceCanvas = extractOcrSourceCanvas(
        page,
        scope === 'composite' ? null : scope
      );

      const currentConfig = getOcrConfig();
      setConfig(currentConfig);

      const results = await runOcrEngine(sourceCanvas, {
        lang: (currentConfig.model || 'eng+ind') as 'eng' | 'ind' | 'eng+ind',
        pageId: page.id,
        sourceWidth: page.width,
        sourceHeight: page.height,
        config: currentConfig,
        signal: abortController.signal,
        retrySegmentIndex: retrySegIdx,
        existingRegions: ocrRegions,
        onProgress: (p) => setProgress(p),
      });

      onUpdatePage((prev) => addOcrRegions(prev, results, mode), 'Run OCR Pipeline');
      // If no failed segments, clear progress bar; otherwise retain for retry option
      setProgress((lastProgress) =>
        lastProgress?.failedSegments && lastProgress.failedSegments.length > 0
          ? lastProgress
          : null
      );
    } catch (err) {
      if (abortController.signal.aborted) {
        setError('OCR operation canceled by user.');
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
      setProgress(null);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelOcr = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const getProviderName = () => {
    if (config.provider === 'tesseract') return 'Tesseract.js (Local WASM)';
    if (config.provider === 'gemini') return `Gemini API (${config.model || '1.5-flash'})`;
    if (config.provider === 'openai') return `OpenAI (${config.model || 'gpt-4o'})`;
    return `OpenAI-Compatible (${config.model || 'custom'})`;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-200 select-none overflow-hidden">
      {/* OCR Header / Config */}
      <div className="p-3 border-b border-zinc-800 space-y-3 bg-zinc-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-semibold text-xs text-sky-400">
            <ScanText className="w-4 h-4" />
            <span>OCR Engine & Speech Bubbles</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Configure AI Provider & API Keys"
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition flex items-center space-x-1 text-[11px]"
          >
            <Settings className="w-3.5 h-3.5 text-sky-400" />
            <span>Settings</span>
          </button>
        </div>

        {/* Active Provider Indicator Card */}
        <div className="p-2 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate pr-1">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-zinc-400 block font-medium">Provider & Model</span>
              <span className="font-semibold text-zinc-200 text-[11px] truncate block">
                {getProviderName()}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-[10px] text-sky-400 hover:underline shrink-0"
          >
            Change
          </button>
        </div>

        {/* Long Page Segmentation Info */}
        <div className="px-2.5 py-1.5 bg-sky-950/20 border border-sky-800/40 rounded text-[10px] text-sky-300 flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <Info className="w-3 h-3 text-sky-400 shrink-0" />
            <span>
              Page {page.width}x{page.height}px
            </span>
          </span>
          <span className="font-mono font-semibold text-sky-200">
            → {estimatedSegments} segment{estimatedSegments === 1 ? '' : 's'}
          </span>
        </div>

        {/* Configuration Grid */}
        <div className="space-y-2 text-xs">
          {/* Target Source Scope Selection */}
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
            <div className="flex space-x-3">
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

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={() => handleRunOcr()}
              disabled={isProcessing || isDrawingManualRegion}
              className="flex-1 py-2 px-3 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium text-xs flex items-center justify-center space-x-2 transition shadow"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Segmented OCR</span>
                </>
              )}
            </button>

            {isProcessing && (
              <button
                onClick={handleCancelOcr}
                title="Cancel OCR Process"
                className="px-3 py-2 bg-rose-900/80 hover:bg-rose-800 text-rose-200 rounded text-xs font-medium flex items-center space-x-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          {/* Manual Text Region Button / Loading State */}
          {isCropOcrRunning ? (
            <div className="p-2.5 bg-purple-950/90 border border-purple-500/80 rounded-lg flex items-center space-x-2 text-xs text-purple-200 shadow">
              <RefreshCw className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
              <div className="flex-1 overflow-hidden">
                <span className="font-semibold block text-[11px]">Recognizing Crop OCR...</span>
                <span className="text-[10px] text-purple-300 opacity-80 block truncate">Running OCR on selected box area</span>
              </div>
            </div>
          ) : isDrawingManualRegion ? (
            <div className="p-2 bg-purple-950/80 border border-purple-600/80 rounded-lg flex items-center justify-between text-xs text-purple-200 animate-pulse">
              <div className="flex items-center space-x-1.5">
                <MousePointerClick className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-medium text-[11px]">Click & drag on canvas to draw box</span>
              </div>
              <button
                onClick={onCancelDrawManualRegion}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-semibold transition shrink-0 ml-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onStartDrawManualRegion}
              disabled={isProcessing}
              className="w-full py-1.5 px-3 rounded bg-purple-700/80 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium text-xs flex items-center justify-center space-x-2 transition shadow border border-purple-500/30"
            >
              <PlusCircle className="w-3.5 h-3.5 text-purple-300" />
              <span>Add Text Region (Manual OCR)</span>
            </button>
          )}
        </div>

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

        {/* Segment Failures Notice & Retry */}
        {progress?.failedSegments && progress.failedSegments.length > 0 && (
          <div className="p-2 bg-amber-950/50 border border-amber-800/80 rounded text-amber-300 text-[10px] flex items-center justify-between">
            <span>
              Segment(s) {progress.failedSegments.map((s) => s + 1).join(', ')} encountered errors.
            </span>
            <button
              onClick={() => handleRunOcr(progress.failedSegments![0])}
              disabled={isProcessing}
              className="text-amber-200 underline font-semibold hover:text-white flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-2 bg-rose-950/60 border border-rose-800/80 rounded text-rose-300 text-[11px] flex items-start space-x-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-rose-200">OCR Notice</p>
              <p className="text-[10px] opacity-90 break-words">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Region List Toolbar */}
      <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-950/80 flex justify-between items-center text-[11px]">
        <span className="text-zinc-400 font-medium">Detected Speech & Text Regions</span>
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
            <p className="text-xs">No text regions detected yet.</p>
            <p className="text-[10px] text-zinc-600 max-w-[200px]">
              Configure your API key in Settings and click "Run Segmented OCR" to automatically extract speech bubbles.
            </p>
          </div>
        ) : (
          ocrRegions.map((region, index) => {
            const isSelected = region.id === selectedRegionId;
            const isManual = region.source === 'manual';
            const isEmptyText = !region.text || region.text.trim().length === 0;

            return (
              <div
                key={region.id}
                onClick={() => onSelectOcrRegion(region.id)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? isManual
                      ? 'bg-purple-950/40 border-purple-500 shadow-lg'
                      : 'bg-sky-950/40 border-sky-500 shadow-lg'
                    : 'bg-zinc-800/60 border-zinc-700/80 hover:bg-zinc-800 hover:border-zinc-600'
                }`}
              >
                {/* Item Meta Bar */}
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        isSelected
                          ? isManual
                            ? 'bg-purple-600 text-white'
                            : 'bg-sky-500 text-white'
                          : isManual
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    {isManual && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Manual
                      </span>
                    )}
                    {isEmptyText && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Empty Text
                      </span>
                    )}
                    <span className="text-zinc-400 font-mono text-[9px]">
                      ({region.bbox.x}, {region.bbox.y}) {region.bbox.width}x{region.bbox.height}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isManual && (
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
                    )}
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
                  className={`w-full bg-zinc-900 border rounded p-1.5 text-xs text-zinc-100 focus:outline-none font-sans leading-relaxed resize-y ${
                    isManual
                      ? 'border-purple-800/80 focus:border-purple-500'
                      : 'border-zinc-700/80 focus:border-sky-500'
                  }`}
                  placeholder={isManual ? 'Enter manual region text...' : 'Recognized text...'}
                />
              </div>
            );
          })
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setConfig(getOcrConfig());
        }}
        onConfigSaved={(updated) => setConfig(updated)}
      />
    </div>
  );
};
