import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MenuBar } from '../components/MenuBar';
import { Toolbar } from '../components/Toolbar';
import { StatusBar } from '../components/StatusBar';
import { GuideModal } from '../components/GuideModal';

describe('UI Bar Components', () => {
  it('renders MenuBar and displays document title', () => {
    const { getByText } = render(
      <MenuBar
        onNewDocument={vi.fn()}
        onOpenImage={vi.fn()}
        onExport={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo={true}
        canRedo={false}
        onSelectAll={vi.fn()}
        onDeselect={vi.fn()}
        onAddLayer={vi.fn()}
        onFitScreen={vi.fn()}
        onZoom100={vi.fn()}
        documentName="Manhwa_Page_01.png"
      />
    );
    expect(getByText('Manhwa_Page_01.png')).toBeInTheDocument();
    expect(getByText('File')).toBeInTheDocument();
  });

  it('renders Toolbar with active tool highlighted', () => {
    const { getByTitle } = render(
      <Toolbar activeTool="brush" onSelectTool={vi.fn()} />
    );
    const brushBtn = getByTitle('Brush Tool (B)');
    expect(brushBtn).toBeInTheDocument();
    expect(brushBtn.className).toContain('bg-sky-600');
  });

  it('renders StatusBar with zoom ratio and dimensions', () => {
    const { getByText } = render(
      <StatusBar
        zoomRatio={1.5}
        width={1200}
        height={1800}
        cursorPos={{ x: 100, y: 200 }}
        activeTool="brush"
      />
    );
    expect(getByText('150%')).toBeInTheDocument();
    expect(getByText('1200 × 1800 px')).toBeInTheDocument();
  });

  it('renders GuideModal when open and handles close action', () => {
    const onClose = vi.fn();
    const { getByText } = render(
      <GuideModal isOpen={true} onClose={onClose} />
    );

    expect(getByText('User Instructions & Keyboard Shortcuts')).toBeInTheDocument();
    expect(getByText('Quick Start Guide')).toBeInTheDocument();

    const closeBtn = getByText("Got it, let's edit");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
