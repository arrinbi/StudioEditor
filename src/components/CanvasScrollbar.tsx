import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CanvasScrollbarProps {
  orientation: 'vertical' | 'horizontal';
  trackLength: number;
  scrollRatio: number;
  thumbSize: number;
  isScrollable: boolean;
  onScrollChange: (newRatio: number) => void;
  scrollbarSize?: number;
}

export const CanvasScrollbar: React.FC<CanvasScrollbarProps> = ({
  orientation,
  trackLength,
  scrollRatio,
  thumbSize,
  isScrollable,
  onScrollChange,
  scrollbarSize = 14,
}) => {
  const isVertical = orientation === 'vertical';
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ pointerPos: number; startRatio: number } | null>(null);

  const travelSpace = Math.max(0, trackLength - thumbSize);
  const clampedRatio = Math.max(0, Math.min(1, scrollRatio));
  const thumbOffset = travelSpace > 0 ? clampedRatio * travelSpace : 0;

  const handlePointerDownThumb = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isScrollable || travelSpace <= 0) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      pointerPos: isVertical ? e.clientY : e.clientX,
      startRatio: clampedRatio,
    };
  };

  const handlePointerMoveThumb = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStartRef.current || travelSpace <= 0) return;

      const currentPointer = isVertical ? e.clientY : e.clientX;
      const delta = currentPointer - dragStartRef.current.pointerPos;
      const deltaRatio = delta / travelSpace;
      const newRatio = Math.max(0, Math.min(1, dragStartRef.current.startRatio + deltaRatio));

      onScrollChange(newRatio);
    },
    [isDragging, isVertical, travelSpace, onScrollChange]
  );

  const handlePointerUpThumb = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrollable || travelSpace <= 0 || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clickPos = isVertical ? e.clientY - rect.top : e.clientX - rect.left;
    const targetThumbPos = clickPos - thumbSize / 2;
    const newRatio = Math.max(0, Math.min(1, targetThumbPos / travelSpace));

    onScrollChange(newRatio);
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dragStartRef.current = null;
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isDragging]);

  if (trackLength <= 0) return null;

  const trackStyle: React.CSSProperties = isVertical
    ? { width: `${scrollbarSize}px`, height: `${trackLength}px` }
    : { width: `${trackLength}px`, height: `${scrollbarSize}px` };

  const thumbStyle: React.CSSProperties = isVertical
    ? {
        top: `${thumbOffset}px`,
        left: '2px',
        right: '2px',
        height: `${thumbSize}px`,
      }
    : {
        left: `${thumbOffset}px`,
        top: '2px',
        bottom: '2px',
        width: `${thumbSize}px`,
      };

  return (
    <div
      ref={trackRef}
      onPointerDown={handleTrackPointerDown}
      style={trackStyle}
      data-testid={`scrollbar-${orientation}`}
      className={`relative bg-zinc-900 border-zinc-800 touch-none select-none ${
        isVertical ? 'border-l' : 'border-t'
      } ${isScrollable ? 'cursor-pointer' : 'opacity-50'}`}
    >
      <div
        onPointerDown={handlePointerDownThumb}
        onPointerMove={handlePointerMoveThumb}
        onPointerUp={handlePointerUpThumb}
        style={thumbStyle}
        data-testid={`scrollbar-thumb-${orientation}`}
        className={`absolute rounded-full transition-colors duration-75 ${
          isDragging
            ? 'bg-sky-500'
            : isScrollable
            ? 'bg-zinc-600 hover:bg-zinc-500 active:bg-sky-500'
            : 'bg-zinc-700'
        }`}
      />
    </div>
  );
};
