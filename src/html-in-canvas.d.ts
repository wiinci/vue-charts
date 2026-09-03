// Ambient types for the WICG HTML-in-Canvas proposal (flag-gated in Chromium
// behind chrome://flags/#canvas-draw-element). Names follow the explainer's
// IDL: https://github.com/WICG/html-in-canvas — README, "IDL changes".
//
// Global script file (no imports/exports) so the interface declarations merge
// with lib.dom — same pattern as src/vite-env.d.ts. Deliberately minimal:
// only what the SankeyCanvas components use, so strict settings stay happy.

interface DrawElementImageOptions {
	preserveElementGeometry?: boolean
}

interface CanvasRenderingContext2D {
	drawElementImage(element: Element, dx: number, dy: number, options?: DrawElementImageOptions): void
}

interface CanvasPaintEvent extends Event {
	readonly changedElements: ReadonlyArray<Element>
}

interface HTMLCanvasElementEventMap {
	paint: CanvasPaintEvent
}

interface HTMLCanvasElement {
	layoutSubtree: boolean
	requestPaint(): void
}
