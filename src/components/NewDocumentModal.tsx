import React, { useState } from 'react';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, width: number, height: number) => void;
}

const PRESETS = [
  { label: 'Webtoon / Manhwa Panel (800 × 1280)', width: 800, height: 1280 },
  { label: 'Full HD Page (1080 × 1920)', width: 1080, height: 1920 },
  { label: 'Standard Manga Page (1200 × 1800)', width: 1200, height: 1800 },
  { label: 'Square Canvas (1080 × 1080)', width: 1080, height: 1080 },
];

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('Untitled Project');
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1620);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(name, width, height);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-md p-5 text-zinc-200 select-none">
        <h2 className="text-base font-bold mb-4 text-zinc-100 flex items-center justify-between border-b border-zinc-800 pb-2">
          <span>Create New Canvas</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            ✕
          </button>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Preset Presets</label>
            <select
              onChange={(e) => {
                const idx = Number(e.target.value);
                if (PRESETS[idx]) {
                  setWidth(PRESETS[idx].width);
                  setHeight(PRESETS[idx].height);
                }
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500"
            >
              <option value="">Custom Dimensions</option>
              {PRESETS.map((p, i) => (
                <option key={i} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Width (px)</label>
              <input
                type="number"
                min="100"
                max="8000"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Height (px)</label>
              <input
                type="number"
                min="100"
                max="12000"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 rounded text-white font-medium transition shadow"
            >
              Create Canvas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
