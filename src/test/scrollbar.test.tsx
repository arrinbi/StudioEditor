import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CanvasScrollbar } from '../components/CanvasScrollbar';
import { CanvasArea } from '../components/CanvasArea';
import type { DocumentState, ViewportState } from '../types/editor';
import { createOffscreenCanvas } from '../core/engine';

describe('CanvasScrollbar & Canvas Area Integration', () => {
  it('renders CanvasScrollbar and handles track clicks and dragging', () => {
    const onScrollChange = vi.fn();
    const { getByTestId } = render(
      <CanvasScrollbar
        orientation="vertical"
        trackLength={400}
        scrollRatio={0.2}
        thumbSize={100}
        isScrollable={true}
        onScrollChange={onScrollChange}
      />
    );

    const track = getByTestId('scrollbar-vertical');
    const thumb = getByTestId('scrollbar-thumb-vertical');

    expect(track).toBeInTheDocument();
    expect(thumb).toBeInTheDocument();

    // Mock track bounding rect
    track.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 0,
      left: 0,
      bottom: 400,
      right: 14,
      width: 14,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Track click
    fireEvent.pointerDown(track, { clientY: 300 });
    expect(onScrollChange).toHaveBeenCalled();

    // Thumb dragging
    thumb.setPointerCapture = vi.fn();
    thumb.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(thumb, { pointerId: 1, clientY: 50 });
    fireEvent.pointerMove(thumb, { pointerId: 1, clientY: 100 });
    expect(onScrollChange).toHaveBeenCalled();
  });

  it('renders CanvasArea with scrollbars synchronized to viewport', () => {
    const canvas = createOffscreenCanvas(1000, 1000);
    const mockDocument: DocumentState = {
      id: 'doc_1',
      name: 'Test Doc',
      width: 1000,
      height: 1000,
      layers: [
        {
          id: 'layer_1',
          name: 'Layer 1',
          type: 'raster',
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
          canvas,
        },
      ],
      activeLayerId: 'layer_1',
      selection: null,
    };

    const mockViewport: ViewportState = {
      zoom: 2.0, // Zoomed in -> scrollable
      panX: -200,
      panY: -300,
    };

    const onViewportChange = vi.fn();

    const { getByTestId } = render(
      <CanvasArea
        document={mockDocument}
        viewport={mockViewport}
        activeTool="brush"
        onViewportChange={onViewportChange}
        onCursorMove={vi.fn()}
        onCanvasPointerDown={vi.fn()}
        onCanvasPointerMove={vi.fn()}
        onCanvasPointerUp={vi.fn()}
      />
    );

    const verticalTrack = getByTestId('scrollbar-vertical');
    const horizontalTrack = getByTestId('scrollbar-horizontal');

    expect(verticalTrack).toBeInTheDocument();
    expect(horizontalTrack).toBeInTheDocument();
  });

  it('allows active tools like Brush to remain active while scrollbars are rendered', () => {
    const canvas = createOffscreenCanvas(800, 600);
    const mockDocument: DocumentState = {
      id: 'doc_brush',
      name: 'Brush Active Doc',
      width: 800,
      height: 600,
      layers: [
        {
          id: 'layer_b',
          name: 'Layer B',
          type: 'raster',
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
          canvas,
        },
      ],
      activeLayerId: 'layer_b',
      selection: null,
    };

    const mockViewport: ViewportState = { zoom: 1.0, panX: 0, panY: 0 };
    const onCanvasPointerDown = vi.fn();

    const { getByTestId } = render(
      <CanvasArea
        document={mockDocument}
        viewport={mockViewport}
        activeTool="brush"
        onViewportChange={vi.fn()}
        onCursorMove={vi.fn()}
        onCanvasPointerDown={onCanvasPointerDown}
        onCanvasPointerMove={vi.fn()}
        onCanvasPointerUp={vi.fn()}
      />
    );

    expect(getByTestId('scrollbar-vertical')).toBeInTheDocument();
    expect(getByTestId('scrollbar-horizontal')).toBeInTheDocument();
  });
});
