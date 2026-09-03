import {afterEach, describe, expect, it, vi} from 'vitest'
import {detectHtmlInCanvas} from '../useHtmlInCanvas'

// happy-dom defines no CanvasRenderingContext2D at all; tests that need the
// constructor stub a minimal one and vi.unstubAllGlobals removes it again.
function stubContextConstructor(drawElementImage?: unknown) {
	const constructor = function CanvasRenderingContext2DStub() {}
	if (drawElementImage) {
		;(constructor.prototype as Record<string, unknown>).drawElementImage = drawElementImage
	}
	vi.stubGlobal('CanvasRenderingContext2D', constructor)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('detectHtmlInCanvas', () => {
	it('reports no-api in a browser without the constructor (happy-dom)', () => {
		expect(detectHtmlInCanvas()).toEqual({supported: false, reason: 'no-api'})
	})

	it('reports no-window when there is no window at all', () => {
		// The default parameter reads globalThis.window — an SSR-like environment
		// has none, which is the only way this branch is reachable.
		vi.stubGlobal('window', undefined)
		expect(detectHtmlInCanvas()).toEqual({supported: false, reason: 'no-window'})
	})

	it('reports support when drawElementImage exists on the prototype', () => {
		stubContextConstructor(vi.fn())
		expect(detectHtmlInCanvas()).toEqual({supported: true, drawMethod: 'drawElementImage'})
	})

	it('reports no-api when the constructor lacks drawElementImage', () => {
		stubContextConstructor()
		expect(detectHtmlInCanvas()).toEqual({supported: false, reason: 'no-api'})
	})
})
