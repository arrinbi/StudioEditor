export type ToolType =
  | 'select'
  | 'brush'
  | 'eraser'
  | 'rectangle-select'
  | 'hand'
  | 'zoom'
  | 'text'
  | 'eyedropper';

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
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
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
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
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
  fontFamily?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  textBold?: boolean;
  textItalic?: boolean;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface OcrRegion {
  id: string;
  pageId: string;
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sourceWidth: number;
  sourceHeight: number;
  translatedText?: string;
}

export interface Page {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string | null;
  selection: SelectionRect | null;
  thumbnailDataUrl?: string;
  ocrRegions?: OcrRegion[];
  selectedOcrRegionId?: string | null;
}

export interface ProjectState {
  id: string;
  name: string;
  activePageId: string;
  pages: Page[];
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

export interface SavedPage {
  id: string;
  name: string;
  width: number;
  height: number;
  activeLayerId: string | null;
  layers: LayerSnapshot[];
  ocrRegions?: OcrRegion[];
}

export interface SavedProject {
  id: string;
  name: string;
  width?: number;
  height?: number;
  updatedAt: number;
  dataUrl?: string;
  activePageId?: string;
  pages?: SavedPage[];
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
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  dataUrl?: string;
  imageSrc?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
}
