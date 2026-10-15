import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LayersPanel } from '../components/LayersPanel';
import { PropertiesPanel } from '../components/PropertiesPanel';
import type { Layer, ToolSettings } from '../types/editor';

describe('Right Dockable Panels', () => {
  const dummyLayer: Layer = {
    id: 'layer-1',
    name: 'Text Layer',
    type: 'raster',
    visible: true,
    locked: false,
    opacity: 0.8,
    x: 0,
    y: 0,
    canvas: document.createElement('canvas'),
  };

  it('renders LayersPanel and triggers layer selection', () => {
    const onSelectLayer = vi.fn();
    const { getByText } = render(
      <LayersPanel
        layers={[dummyLayer]}
        activeLayerId="layer-1"
        onSelectLayer={onSelectLayer}
        onRenameLayer={vi.fn()}
        onToggleVisibility={vi.fn()}
        onToggleLock={vi.fn()}
        onAddLayer={vi.fn()}
        onDuplicateLayer={vi.fn()}
        onDeleteLayer={vi.fn()}
        onReorderLayer={vi.fn()}
        onOpacityChange={vi.fn()}
      />
    );

    expect(getByText('Text Layer')).toBeInTheDocument();
    fireEvent.click(getByText('Text Layer'));
    expect(onSelectLayer).toHaveBeenCalledWith('layer-1');
  });

  it('renders PropertiesPanel and handles brush color change', () => {
    const onSettingsChange = vi.fn();
    const settings: ToolSettings = {
      brushSize: 20,
      brushColor: '#ff0000',
      brushOpacity: 1,
      brushHardness: 0.8,
      eraserSize: 30,
      eraserOpacity: 1,
    };

    const { getAllByDisplayValue } = render(
      <PropertiesPanel
        activeTool="brush"
        settings={settings}
        onSettingsChange={onSettingsChange}
        hasSelection={false}
        onClearSelectionContent={vi.fn()}
        onFillSelectionContent={vi.fn()}
        onDeselect={vi.fn()}
      />
    );

    const inputs = getAllByDisplayValue('#ff0000');
    expect(inputs.length).toBeGreaterThan(0);
    fireEvent.change(inputs[0], { target: { value: '#00ff00' } });
    expect(onSettingsChange).toHaveBeenCalledWith({ brushColor: '#00ff00' });
  });
});
