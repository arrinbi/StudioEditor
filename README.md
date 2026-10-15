# ScanlationStudio - Professional Web Image Editor

A professional, browser-based image editor inspired by Adobe Photoshop, designed for both Android mobile browsers and desktop computers with specialized workflows for manhwa and comic scanlation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tech Stack](https://img.shields.io/badge/tech--stack-React%20%7C%20TypeScript%20%7C%20Konva.js%20%7C%20TailwindCSS-sky)

---

## Features

- **Photoshop-Style Interface**: Complete dark-theme workspace with Top Menu & Action bar, vertical Toolbar, central canvas area, right dockable panels (Layers, Properties, History), and bottom Status Bar.
- **Mobile Responsive & Touch Optimized**: Collapsible panel drawers for Android mobile devices, touch drawing, pinch-to-zoom, and touch panning without canvas scroll interference.
- **Full-Resolution Canvas**: Offscreen canvas processing guarantees edits and exports maintain original image dimensions and quality without silent scaling.
- **Image Editing & Layer Pipeline**:
  - Protected original image layers to prevent accidental destructive edits.
  - Adding, renaming, hiding, locking, reordering, duplicating, and deleting layers.
  - Variable brush & eraser tools (size, opacity, hardness, color).
  - Rectangle marquee selection with clear, fill, and translation controls.
  - Full Undo/Redo history stack with state snapshotting.
- **Local Persistence & Export**: Local project storage backed by IndexedDB and full-resolution PNG and JPEG export.
- **Scanlation Architecture**: Extensible design supporting future cleaning mask layers, text typesetting layers, OCR, and batch export.

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Canvas Rendering Engine**: Konva / React Konva & HTML5 Offscreen Canvas API
- **Styling**: Tailwind CSS v4 & Lucide Icons
- **Local Storage**: IndexedDB (`idb` & `fake-indexeddb`)
- **Testing**: Vitest + React Testing Library

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation & Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/arrinbi/StudioEditor.git
   cd StudioEditor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start local development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## Testing & Build

### Running Automated Tests

Run the Vitest test suite covering canvas coordinates, layer state management, history undo/redo, raster drawing engine, and export pipeline:

```bash
npx vitest run
```

### Production Build

Compile TypeScript and build static assets for production deployment:

```bash
npm run build
```

The output bundle will be generated in the `dist/` directory.

---

## Deployment to GitHub Pages

This project includes a GitHub Actions workflow `.github/workflows/deploy.yml` that automatically builds and deploys the application to GitHub Pages whenever changes are pushed to the `main` or `master` branch.

### Deployment Setup:

1. Push your code to GitHub.
2. In your repository on GitHub, go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The workflow will trigger on push and publish the site automatically.

---

## Manual Testing Checklist

### Desktop Browsers (Chrome, Firefox, Safari, Edge)

- [ ] **File Operations**:
  - Open a PNG/JPG/WebP file via `File -> Open Image...`. Confirm image dimensions match actual image size in the status bar.
  - Create a new document with custom dimensions via `File -> New Canvas...`.
  - Export document as PNG and JPEG (`File -> Export`). Confirm exported image dimensions match original dimensions.
- [ ] **Tools & Canvas Navigation**:
  - Zoom using mouse wheel and verify zoom percentage in status bar.
  - Pan canvas using Hand Tool or middle mouse click.
  - Fit canvas to screen using `View -> Fit on Screen` or Menu button.
- [ ] **Drawing & Editing**:
  - Draw using Brush tool with different sizes, colors, hardness, and opacity.
  - Erase raster content using Eraser tool.
  - Drag marquee selection box with Rectangle Selection tool. Clear or fill selection content.
  - Move active layer content using Move tool.
- [ ] **Layers & History**:
  - Create, rename, duplicate, hide, lock, reorder, and delete layers in Layers panel.
  - Perform multiple actions and jump back/forth using the History panel and `Ctrl+Z` / `Ctrl+Y`.

### Android Mobile Browsers (Chrome, Firefox)

- [ ] **Mobile Interface & Layout**:
  - Verify workspace fits mobile screen without horizontal page scrolling outside canvas.
  - Tap `Panels` drawer toggle button at top right to open/close tabbed panels (Layers, Properties, History).
- [ ] **Touch Gesture Controls**:
  - Pan canvas smoothly using single touch with Hand tool or two-finger touch.
  - Pinch-to-zoom in/out on the canvas.
  - Draw smoothly on raster layers using single finger touch without triggering default browser page scrolling.
- [ ] **Touch Usability**:
  - Touch targets for toolbar buttons and panel items are comfortable to tap.
