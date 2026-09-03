import {computed, type ComputedRef} from 'vue'

export type HtmlInCanvasSupport =
	| {supported: true; drawMethod: 'drawElementImage'}
	| {supported: false; reason: 'no-window' | 'no-api'}

/**
 * Detect the WICG HTML-in-Canvas API by its IDL name only. Older Canary builds
 * exposed `drawElement` and the html-in-canvas.dev demo shims it; the IDL is
 * authoritative — feature-detect `drawElementImage` and never rely on a
 * return value.
 */
export function detectHtmlInCanvas(
	win: (Window & typeof globalThis) | undefined = globalThis.window,
): HtmlInCanvasSupport {
	if (!win) return {supported: false, reason: 'no-window'}

	// A window without the constructor (happy-dom, older browsers) still means
	// "API absent" — only a missing window at all is no-window.
	const proto = win.CanvasRenderingContext2D?.prototype
	if (!proto || typeof proto.drawElementImage !== 'function') {
		return {supported: false, reason: 'no-api'}
	}

	return {supported: true, drawMethod: 'drawElementImage'}
}

export function useHtmlInCanvas(): ComputedRef<HtmlInCanvasSupport> {
	return computed(() => detectHtmlInCanvas())
}
