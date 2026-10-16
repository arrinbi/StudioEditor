import React, { useState } from 'react';
import type { OcrProviderConfig, OcrProviderType } from '../services/aiSettings';
import {
  getOcrConfig,
  saveOcrConfig,
  DEFAULT_MODELS,
  DEFAULT_BASE_URLS,
} from '../services/aiSettings';
import { testProviderConnection } from '../services/ocr/testConnection';
import {
  X,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldAlert,
  Globe,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: OcrProviderConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<OcrProviderConfig>(() => getOcrConfig());
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: OcrProviderType) => {
    const defaultModel = DEFAULT_MODELS[newProvider]?.[0] || '';
    const defaultBaseUrl = DEFAULT_BASE_URLS[newProvider] || config.baseUrl || 'https://api.openai.com/v1';

    setConfig((prev) => ({
      ...prev,
      provider: newProvider,
      model: defaultModel,
      baseUrl: defaultBaseUrl,
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testProviderConnection(config);
      setTestResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: `Connection failed: ${msg}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    saveOcrConfig(config);
    onConfigSaved?.(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-2 font-bold text-sky-400">
            <Sparkles className="w-5 h-5" />
            <span>AI OCR Provider Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-zinc-300 font-semibold flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>OCR Engine / Provider</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'tesseract', label: 'Tesseract.js (Local WASM)', desc: 'Free, Offline, No API key needed' },
                { id: 'gemini', label: 'Google Gemini API', desc: 'Gemini 1.5 Flash / 2.0 Flash / Pro' },
                { id: 'openai', label: 'OpenAI API', desc: 'GPT-4o / GPT-4o-mini' },
                { id: 'openai-compatible', label: 'OpenAI-Compatible Service', desc: 'SumoPod, LocalAI, Custom Proxy' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id as OcrProviderType)}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                    config.provider === p.id
                      ? 'bg-sky-950/40 border-sky-500 text-sky-200 ring-1 ring-sky-500/50'
                      : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span className="font-semibold text-xs">{p.label}</span>
                  <span className="text-[10px] text-zinc-400 mt-1">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Provider Specific Settings */}
          {config.provider !== 'tesseract' && (
            <div className="space-y-4 bg-zinc-950/40 border border-zinc-800 p-4 rounded-lg">
              {/* API Key Input */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>API Key</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    BYOK (Bring Your Own Key)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder={`Enter your ${config.provider === 'gemini' ? 'Gemini' : 'OpenAI'} API key...`}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 pl-3 pr-10 text-xs text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Base URL Input (for OpenAI-Compatible) */}
              {config.provider === 'openai-compatible' && (
                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-semibold flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>API Base URL</span>
                  </label>
                  <input
                    type="text"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="https://api.sumopod.com/v1"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold flex items-center space-x-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>Model Name</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    placeholder="Select or enter model name..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <select
                    value={DEFAULT_MODELS[config.provider]?.includes(config.model) ? config.model : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setConfig({ ...config, model: e.target.value });
                      }
                    }}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-xs text-zinc-300 focus:outline-none"
                  >
                    {DEFAULT_MODELS[config.provider]?.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                </div>
              </div>

              {/* Test Connection Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || !config.apiKey}
                  className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-40 text-zinc-200 font-medium text-xs flex items-center space-x-2 transition"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span>Testing API Connection...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>Test API Connection</span>
                    </>
                  )}
                </button>

                {/* Test Result Message */}
                {testResult && (
                  <div
                    className={`mt-2.5 p-2.5 rounded-lg border text-[11px] flex items-start space-x-2 ${
                      testResult.success
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span className="break-words font-medium">{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Credential Storage Toggle & Warning */}
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={config.persistApiKey}
                    onChange={(e) => setConfig({ ...config, persistApiKey: e.target.checked })}
                    className="accent-sky-500 rounded"
                  />
                  <span className="font-medium text-zinc-300">
                    Persist API key in browser LocalStorage
                  </span>
                </label>
                <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 rounded-lg text-amber-300 text-[10px] space-y-1 flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-200">Security & Privacy Notice:</span>
                    <span>
                      API keys are treated as client runtime credentials. Keys are never transmitted to any central StudioEditor server or saved inside exported project JSON, PDF, or ZIP files. Direct browser API calls expose keys to local browser extensions or network inspectors.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manhwa Page Segmentation Settings */}
          <div className="space-y-3 bg-zinc-950/40 border border-zinc-800 p-4 rounded-lg">
            <div className="text-zinc-300 font-semibold flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Manhwa Long-Page Auto-Segmentation</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px] font-medium">
                  Max Segment Height (px)
                </label>
                <input
                  type="number"
                  min={500}
                  max={4000}
                  step={100}
                  value={config.maxSegmentHeight}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxSegmentHeight: Math.max(500, parseInt(e.target.value) || 1500),
                    })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 px-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px] font-medium">
                  Segment Overlap (px)
                </label>
                <input
                  type="number"
                  min={50}
                  max={500}
                  step={25}
                  value={config.overlapHeight}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overlapHeight: Math.max(20, parseInt(e.target.value) || 150),
                    })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 px-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-zinc-400 flex items-center space-x-1">
              <Info className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>
                Vertical manhwa pages exceeding Max Segment Height will be automatically sliced into overlapping sequential segments prior to sending vision OCR requests.
              </span>
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-zinc-800 flex justify-end space-x-2 bg-zinc-950/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow transition"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
