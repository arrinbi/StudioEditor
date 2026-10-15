export type ToolType =
  | 'select'
  | 'brush'
  | 'eraser'
  | 'rectangle-select'
  | 'hand'
  | 'zoom';

export type LayerType = 'raster' | 'image' | 'mask' | 'text';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  isProtected?: boolean;
  x: number;
  y: number;
}

export interface RasterLayer extends BaseLayer {
  type: 'raster';
  canvas: HTMLCanvasElement;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  image: HTMLImageElement;
  src: string;
  width: number;
  height: number;
}

export interface MaskLayer extends BaseLayer {
  type: 'mask';
  canvas: HTMLCanvasElement;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  width: number;
  height: number;
}

export type Layer = RasterLayer | ImageLayer | MaskLayer | TextLayer;

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ToolSettings {
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  brushHardness: number;
  eraserSize: number;
  eraserOpacity: number;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface DocumentState {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string | null;
  selection: SelectionRect | null;
}

export interface HistoryItem {
  id: string;
  description: string;
  timestamp: number;
  layersSnapshot: LayerSnapshot[];
  activeLayerId: string | null;
  selection: SelectionRect | null;
}

export interface LayerSnapshot {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  isProtected?: boolean;
  x: number;
  y: number;
  dataUrl?: string;
  imageSrc?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  width?: number;
  height?: number;
}
