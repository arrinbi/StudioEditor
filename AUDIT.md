# StudioEditor - Codebase & Feature Audit Report

**Date**: February 2025
**Project**: StudioEditor (`arrinbi/StudioEditor`)
**Target Goal**: Build StudioEditor into a professional Photoshop Lite-style web image editor with integrated scanlation workflows (OCR, translation, cleaning, typesetting, and multi-page export).

---

## 1. Executive Summary & Verification Results

A complete audit of the codebase, architecture, dependencies, and test suite was conducted prior to making functional changes.

### Build & Test Suite Verification
- **Automated Test Suite**: Passed (`8/8` test files, `17/17` total unit tests passing).
  - Tests cover: Canvas coordinate calculations, layer state snapshotting & history, raster stroke drawing, marquee selection operations, offscreen composite export, storage persistence, and UI component rendering.
- **Production Build**: Passed (`tsc -b && vite build` completed successfully).
  - Output bundle generated cleanly in `dist/`.
- **Linting**: Clean execution with `oxlint`.

---

## 2. Architecture & Technical Overview

- **Framework**: React 19 + TypeScript (Strict Mode)
- **Canvas Rendering Engine**: Konva (`react-konva` v19.3.2 / `konva` v10.9.0) + HTML5 Offscreen Canvas API
- **Styling**: Tailwind CSS v4 + Lucide Icons (`lucide-react`)
- **Persistence**: IndexedDB via `idb` (`PhotoshopScanlationDB`) with background autosaving
- **Test Runner**: Vitest (`vitest` v5.0.4) + React Testing Library + `jsdom` + `fake-indexeddb`

### Architectural Strengths
1. **Full-Resolution Offscreen Canvas Engine**: Edits and stroke operations are performed on offscreen HTML5 `<canvas>` elements matching native image dimensions, preventing quality degradation or silent canvas scaling.
2. **Robust Immutable History Stack**: `HistoryManager` serializes layer states into base64 PNG data URLs, enabling reliable undo/redo (`Ctrl+Z`, `Ctrl+Y`) and history jumping without state corruption.
3. **Protected Base Layer Model**: Base image layers opened via `File -> Open Image` are marked `isProtected` and locked by default to prevent accidental destructive editing.

---

## 3. Comprehensive Feature Matrix

### A. Core Photoshop Lite Capabilities

| Feature Category | Feature Description | Status | Implementation Details / Gaps |
| :--- | :--- | :--- | :--- |
| **Workspace & UI** | Professional dark desktop workspace | **Verified Working** | Menu bar, tool options bar, vertical toolbar, canvas, right panels, status bar. |
| **Workspace & UI** | Mobile responsive panel drawers | **Verified Working** | Collapsible tabbed drawer for mobile screens. |
| **Document Mgmt** | Create new canvas | **Verified Working** | Preset modal (Webtoon, Manga, Full HD, Square) or custom dimensions. |
| **Document Mgmt** | Open image file | **Verified Working** | Imports PNG/JPG/WebP, sets protected base image layer + clean edit layer. |
| **Document Mgmt** | Local persistence | **Verified Working** | IndexedDB autosave with project metadata storage. |
| **Viewport Controls**| Zoom (Wheel / Tool / Buttons) | **Verified Working** | Smooth zoom (0.05x to 20x), Shift+click zoom out, presets (Fit Screen, 100%). |
| **Viewport Controls**| Pan (Hand Tool / Middle Click) | **Verified Working** | Hand tool and middle-mouse drag pan canvas. |
| **Tools** | Move / Selection Tool (`V`) | **Verified Working** | Translates active layer `x`/`y` coordinates across canvas. |
| **Tools** | Brush Tool (`B`) | **Verified Working** | Configurable color, size (1-200px), opacity, and soft shadow blur hardness. |
| **Tools** | Eraser Tool (`E`) | **Verified Working** | Configurable size and opacity using `destination-out` composite. |
| **Tools** | Marquee Selection (`M`) | **Verified Working** | Rectangular marquee, Clear selection (`clearRect`), Fill selection (`fillRect`). |
| **Tools** | Text Tool (`T`) | **Partially Implemented** | Data types & composite export exist; missing toolbar button, canvas stage tool, and UI editor. |
| **Tools** | Eyedropper / Color Picker | **Missing** | Color swatch input exists; canvas pixel eyedropper tool is missing. |
| **Tools** | Shape Tools (Rect/Ellipse/Bubble) | **Missing** | No shape tools or vector shape creation. |
| **Layer Pipeline** | Layer CRUD Operations | **Verified Working** | Add, rename (double click), duplicate, delete, reorder (up/down). |
| **Layer Pipeline** | Layer Settings | **Verified Working** | Toggle visibility (`Eye`), toggle lock (`Lock`), opacity slider (0-100%). |
| **Layer Pipeline** | Layer Protection | **Verified Working** | Prevents accidental deletion of protected base image layer. |
| **History & Shortcuts**| Undo / Redo | **Verified Working** | Full stack with snapshotting; `Ctrl+Z` / `Ctrl+Y`. |
| **History & Shortcuts**| History Jump | **Verified Working** | Click any step in History panel to jump to state. |
| **History & Shortcuts**| Keyboard Shortcuts | **Verified Working** | `V`, `B`, `E`, `M`, `H`, `Z`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+A`, `Esc`. |
| **Transform / Crop**| Canvas Crop & Resize | **Missing** | No document cropping or canvas resize modal. |
| **Transform / Crop**| Image Rotation & Flip | **Missing** | No 90°/180° rotation or horizontal/vertical flip. |
| **Transform / Crop**| Free Transform Handles | **Missing** | Layer move works, but visual transform handles (scale/skew/rotate) are missing. |
| **Adjustments** | Image Adjustments | **Missing** | No brightness/contrast, levels, hue/saturation, or invert controls. |

---

### B. Scanlation Workflow Capabilities

| Workflow Step | Feature Description | Status | Current State & Technical Requirements |
| :--- | :--- | :--- | :--- |
| **Text Cleaning** | Manual Brush / Eraser cleaning | **Verified Working** | High-precision brush and eraser with opacity/hardness control. |
| **Text Cleaning** | Marquee Clear / Fill | **Verified Working** | Draw selection over speech bubbles -> Clear or Fill with background color. |
| **Text Cleaning** | AI Inpainting / Background Restore | **Missing** | Requires client-side WASM or external AI API (e.g. LaMa / Stable Diffusion inpainting) with interactive Preview Accept/Reject modal. |
| **OCR** | Speech bubble auto-detection | **Missing** | Requires vision model / contour detection for bubble bounding boxes. |
| **OCR** | Optical Character Recognition | **Missing** | Requires Tesseract.js (client-side WASM OCR) or external Cloud OCR API (Google Vision / MangaOCR). |
| **Translation** | Translation management workflow | **Missing** | Needs Translation Panel showing side-by-side detected source text, edited original text, and target translation (optional auto-translate via LLM API). |
| **Typesetting** | On-canvas movable text objects | **Partially Implemented** | `TextLayer` type exists, rendered in composite export; needs interactive Konva Text node with transformer handles. |
| **Typesetting** | Rich Text Formatting | **Missing** | Needs font selector, font size, bold/italic, fill color, stroke/outline color & width, line height, alignment, auto word-wrap / bubble fitting. |

---

### C. Multi-Page & Export Capabilities

| Export Format / Scope | Status | Details / Technical Requirements |
| :--- | :--- | :--- |
| **Single Page PNG Export** | **Verified Working** | Offscreen composite canvas export at native image dimensions. |
| **Single Page JPEG Export** | **Verified Working** | Offscreen composite JPEG export with 0.95 quality. |
| **Single Page WebP Export** | **Missing** | Requires adding `'webp'` format to `exportDocumentFile` (`canvas.toDataURL('image/webp')`). |
| **Multi-Page Document Model**| **Missing** | App current state is single-document. Needs Multi-Page project model (page sidebar/strip, page reordering, page add/delete). |
| **PDF Export (Single / Multi)**| **Missing** | Requires `jspdf` library integration to render pages into multi-page PDF document. |
| **ZIP Batch Page Export** | **Missing** | Requires `JSZip` library integration to package all page exports into a single download archive. |

---

## 4. Technical Limitations & External Dependencies

1. **OCR Engine**:
   - *Option A (Pure Offline/Client)*: `tesseract.js` (WebAssembly). Good for standard printed text; may require pre-processing (binarization/contrast boost) for manga/manhwa text.
   - *Option B (Cloud / Specialized API)*: External MangaOCR endpoint or Google Vision API for Japanese/Korean/Chinese manga text extraction.
2. **AI Inpainting / Cleaning**:
   - Heavy AI models (e.g., LaMa, Manga Inpainter) cannot run efficiently in browser JS without WebGPU/WASM or server API.
   - For pure web browser client without GPU servers, a smart patch-match inpainting algorithm or external API endpoint with a Preview Accept/Reject workflow must be provided.
3. **Multi-Page Storage Limits**:
   - Storing full-resolution raw canvas snapshots for multiple 4K/8K webtoon pages in IndexedDB can reach browser quota limits.
   - Strategy: Store compressed JPEG/PNG blobs or serialized vector layers for multi-page documents.
4. **PDF & ZIP Generation**:
   - Client-side PDF (`jspdf`) and ZIP packaging (`jszip`) are fully compatible with web browser deployment on GitHub Pages.

---

## 5. Recommended Implementation Roadmap

To maintain stability, existing tests, and GitHub Pages compatibility, implementation should proceed in clear, modular phases:

### Phase 1: Core Photoshop Lite Expansion (Next Step)
1. Add Text Tool (`T`) to toolbar with Konva on-canvas interactive text rendering, rotation, and move handles.
2. Add Eyedropper tool (`I`) for canvas color picking.
3. Implement Crop, Canvas Resize, and Image Rotate (90°/180°/Flip).
4. Add basic Image Adjustments (Brightness, Contrast, Hue, Saturation, Invert).
5. Add WebP single-page export format.

### Phase 2: Multi-Page & Advanced Export Pipeline
1. Add Multi-Page project manager with a page thumbnail sidebar strip (add page, remove page, reorder pages).
2. Integrate `jspdf` for multi-page PDF export.
3. Integrate `jszip` for batch exporting pages as a single ZIP archive.

### Phase 3: Scanlation Typesetting & Cleaning
1. Enhance Typesetting Engine: Outline/stroke text, bubble fitting/word wrap, vertical text support, custom web fonts.
2. Implement Manual Inpainting & Cleaning Mask Layer with AI Inpainting Preview Accept/Reject interface.

### Phase 4: OCR & Integrated Translation Workflow
1. Integrate Tesseract.js / MangaOCR service for speech bubble text extraction.
2. Create Translation Panel: Side-by-side source OCR text, translation editor, and single-click "Typeset to Canvas" conversion.

---

## 6. Audit Summary

The existing StudioEditor codebase provides a solid, well-tested foundation with clean architecture, protected layers, full-resolution offscreen rendering, and reliable local IndexedDB storage.

All 17 unit tests and the production build pass cleanly. The roadmap above outlines how to expand StudioEditor into a comprehensive, professional Photoshop Lite + Scanlation editor without breaking existing features or GitHub Pages deployment.
