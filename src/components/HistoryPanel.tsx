import React from 'react';
import type { HistoryItem } from '../types/editor';

interface HistoryPanelProps {
  items: HistoryItem[];
  currentIndex: number;
  onJumpTo: (index: number) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  items,
  currentIndex,
  onJumpTo,
}) => {
  return (
    <div className="flex flex-col h-full text-xs text-zinc-300 select-none">
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 p-1">
        {items.map((item, index) => {
          const isActive = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div
              key={item.id}
              onClick={() => onJumpTo(index)}
              className={`flex items-center space-x-2 px-2.5 py-1.5 rounded transition cursor-pointer my-0.5 ${
                isActive
                  ? 'bg-sky-900/50 border border-sky-600/60 text-white font-medium'
                  : isFuture
                  ? 'text-zinc-600 hover:bg-zinc-800/40'
                  : 'text-zinc-400 hover:bg-zinc-800/60'
              }`}
            >
              <span className="font-mono text-[10px] w-4 text-zinc-500">{index + 1}</span>
              <span className="truncate flex-1">{item.description}</span>
              {isActive && <span className="text-sky-400 text-xs">●</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
