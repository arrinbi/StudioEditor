import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  FileText,
} from 'lucide-react';
import type { Page } from '../types/editor';

interface PagePanelProps {
  pages: Page[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPage: (fromIndex: number, toIndex: number) => void;
}

export const PagePanel: React.FC<PagePanelProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorderPage,
}) => {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const confirmDelete = (pageId: string) => {
    if (pages.length <= 1) {
      alert('Cannot delete the only page in the project.');
      return;
    }
    setDeleteTargetId(pageId);
  };

  const executeDelete = () => {
    if (deleteTargetId) {
      onDeletePage(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100 select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-950/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Pages ({pages.length})</span>
        </div>
        <button
          onClick={onAddPage}
          title="Add New Page"
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Page</span>
        </button>
      </div>

      {/* Pages Filmstrip List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-xs">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <p>No pages available</p>
            <button
              onClick={onAddPage}
              className="mt-2 px-3 py-1 bg-emerald-600 text-white rounded text-xs"
            >
              Create Page
            </button>
          </div>
        ) : (
          pages.map((page, index) => {
            const isActive = page.id === activePageId;
            return (
              <div
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`group relative flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800/90 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700'
                }`}
              >
                {/* Page Number Badge */}
                <div className="flex flex-col items-center justify-center w-6 text-xs font-mono font-bold text-zinc-400">
                  <span>#{index + 1}</span>
                </div>

                {/* Page Thumbnail Preview */}
                <div className="w-14 h-18 bg-zinc-950 rounded border border-zinc-700/80 overflow-hidden flex items-center justify-center shrink-0 relative">
                  {page.thumbnailDataUrl ? (
                    <img
                      src={page.thumbnailDataUrl}
                      alt={page.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {page.width}x{page.height}
                    </div>
                  )}
                </div>

                {/* Page Metadata */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-xs font-medium text-zinc-200 truncate">
                    {page.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {page.width} × {page.height} px
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {page.layers.length} {page.layers.length === 1 ? 'layer' : 'layers'}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderPage(index, index - 1);
                    }}
                    title="Move Up"
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={index === pages.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderPage(index, index + 1);
                    }}
                    title="Move Down"
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Additional Quick Actions */}
                <div className="flex items-center gap-1 pl-1 border-l border-zinc-800">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(page.id);
                    }}
                    title="Duplicate Page"
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(page.id);
                    }}
                    title="Delete Page"
                    disabled={pages.length <= 1}
                    className="p-1 hover:bg-red-900/50 rounded text-zinc-400 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-2">Delete Page?</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Are you sure you want to delete this page? All artwork and text layers on this page will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-3 py-1.5 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-500 rounded transition-colors"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
