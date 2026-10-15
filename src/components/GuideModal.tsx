import React from 'react';
import { X, HelpCircle, Keyboard, Layers, Sparkles, Move, Paintbrush, Eraser, Square, Hand, ZoomIn } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'V', tool: 'Move / Layer Select Tool', icon: <Move className="w-3.5 h-3.5 text-sky-400" /> },
    { key: 'B', tool: 'Brush Tool', icon: <Paintbrush className="w-3.5 h-3.5 text-sky-400" /> },
    { key: 'E', tool: 'Eraser Tool', icon: <Eraser className="w-3.5 h-3.5 text-sky-400" /> },
    { key: 'M', tool: 'Marquee Rect Selection', icon: <Square className="w-3.5 h-3.5 text-sky-400" /> },
    { key: 'H', tool: 'Hand / Pan Tool', icon: <Hand className="w-3.5 h-3.5 text-sky-400" /> },
    { key: 'Z', tool: 'Zoom Tool (Click = In, Shift+Click = Out)', icon: <ZoomIn className="w-3.5 h-3.5 text-sky-400" /> },
    { key: 'Ctrl + Z', tool: 'Undo Last Action' },
    { key: 'Ctrl + Y / Ctrl+Shift+Z', tool: 'Redo Action' },
    { key: 'Ctrl + A', tool: 'Select Entire Canvas' },
    { key: 'Esc', tool: 'Deselect Selection Box' },
  ];

  const steps = [
    {
      title: '1. Open Canvas or Image',
      description: 'Use File → Open Image or Ctrl+O to load a manga/comic page or start a new blank document.',
      icon: <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />,
    },
    {
      title: '2. Drawing & Cleaning',
      description: 'Select the Brush or Eraser tool. Adjust brush size, hardness, color, and opacity in the contextual bar at the top or properties panel.',
      icon: <Paintbrush className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />,
    },
    {
      title: '3. Layer Management',
      description: 'Work non-destructively by creating raster layers in the Layers panel. Reorder, lock, or adjust layer opacity safely.',
      icon: <Layers className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />,
    },
    {
      title: '4. Selection & Fills',
      description: 'Draw marquee boxes (M) to fill areas with solid colors or clear speech bubbles quickly.',
      icon: <Square className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center space-x-2 text-sky-400 font-semibold text-sm">
            <HelpCircle className="w-4 h-4" />
            <span className="text-zinc-100">User Instructions & Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-zinc-300">
          {/* Instructions */}
          <div>
            <h3 className="text-zinc-100 font-semibold text-xs tracking-wider uppercase mb-3 flex items-center space-x-1.5">
              <span>Quick Start Guide</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {steps.map((step, idx) => (
                <div key={idx} className="bg-zinc-800/60 border border-zinc-700/50 p-3 rounded-lg flex items-start space-x-2.5">
                  {step.icon}
                  <div>
                    <h4 className="font-semibold text-zinc-200 text-xs mb-1">{step.title}</h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-zinc-100 font-semibold text-xs tracking-wider uppercase mb-3 flex items-center space-x-1.5">
              <Keyboard className="w-4 h-4 text-sky-400" />
              <span>Keyboard Shortcuts</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shortcuts.map((sc, idx) => (
                <div key={idx} className="bg-zinc-850 bg-zinc-800/40 border border-zinc-800 p-2 rounded flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-zinc-300">
                    {sc.icon}
                    <span>{sc.tool}</span>
                  </div>
                  <kbd className="bg-zinc-900 border border-zinc-700/80 px-1.5 py-0.5 rounded font-mono text-[10px] text-sky-300 font-semibold">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs font-medium transition"
          >
            Got it, let's edit
          </button>
        </div>
      </div>
    </div>
  );
};
