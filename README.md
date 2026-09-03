# Vue Charts (Vue 3.5 + Vite)

A collection of interactive charts built with Vue 3.5 and D3.js. This project
demonstrates how to create data visualizations with modern Vue features.

## Features

- Built with Vue 3.5 and Vite 5
- TypeScript support
- D3.js integration
- Modern component architecture with `<script setup>` syntax
- Responsive chart components

## Updated to Vue 3.5

This project has been updated to Vue 3.5, which includes:

- Improved TypeScript integration
- Enhanced `<Suspense>` component
- Performance improvements
- See [VUE_3_5_MIGRATION.md](./VUE_3_5_MIGRATION.md) for details

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) +
  [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Sankey canvas route

`/sankey` renders the dependency Sankey from the home page through a 2D
`<canvas>`, whose 49 labels are real HTML elements. With the WICG
HTML-in-Canvas proposal available they are drawn into the canvas bitmap with
`drawElementImage()`; everywhere else the same elements are positioned over the
canvas with CSS. The diagram — layout, colours, stroke weights, hover
highlighting — is identical in both modes; a footnote under the frame states
which one is active.

### Exercising the HTML-in-Canvas path

The API is flag-gated in Chromium (not available in stable browsers yet):

1. Use **Chrome Canary**, or **Brave** on Chromium 147+.
2. Open `chrome://flags/#canvas-draw-element`.
3. Set **Experimental Web Platform feature: HTML in Canvas** to **Enabled**.
4. Relaunch, then open `/sankey` again.

### What each mode looks like

- **HTML-in-Canvas** — footnote reads *"Rendered with HTML-in-Canvas: labels are
  HTML elements drawn into the canvas with drawElementImage()."* The labels are
  children of the `<canvas>` element, laid out by it, painted into its bitmap,
  and present in the accessibility tree at their drawn positions.
- **Overlay fallback** — footnote reads *"HTML-in-Canvas is not available in
  this browser; labels are HTML positioned over the canvas. To exercise the
  API: Chrome Canary or Brave → chrome://flags/#canvas-draw-element → Enabled →
  relaunch."* Links are still canvas strokes; the labels are the same elements
  positioned by CSS on top.

