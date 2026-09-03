import {flushPromises, mount, type VueWrapper} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import sankeyJsonData from '@/data/edges2.json'
import type {SankeyLink} from '@/composables/useNodesAndLinks'
import SankeyCanvas from '../SankeyCanvas.vue'

const appProps = {
	data: sankeyJsonData.map((item) => ({...item, value: 1})) as SankeyLink[],
	height: 480,
	marginLeft: 20,
	marginRight: 20,
	marginBottom: 20,
	marginTop: 20,
	nodeAlign: 'justify' as const,
	nodeId: 'id',
	nodePadding: 1e9,
	nodeWidth: 1e-9,
	sort: false,
	width: 960,
}

interface StrokeRecord {
	strokeStyle: string
	lineWidth: number
}

type RecordingContext = CanvasRenderingContext2D & {
	clearRect: ReturnType<typeof vi.fn>
	drawElementImage: ReturnType<typeof vi.fn>
	restore: ReturnType<typeof vi.fn>
	save: ReturnType<typeof vi.fn>
	scale: ReturnType<typeof vi.fn>
	setTransform: ReturnType<typeof vi.fn>
	stroke: ReturnType<typeof vi.fn>
}

let strokes: StrokeRecord[]
let recordingCtx: RecordingContext
let requestPaint: ReturnType<typeof vi.fn>

beforeEach(() => {
	strokes = []
	recordingCtx = {
		clearRect: vi.fn(),
		drawElementImage: vi.fn(),
		restore: vi.fn(),
		save: vi.fn(),
		scale: vi.fn(),
		setTransform: vi.fn(),
		stroke: vi.fn(() => {
			strokes.push({strokeStyle: recordingCtx.strokeStyle as string, lineWidth: recordingCtx.lineWidth})
		}),
		globalCompositeOperation: 'source-over',
		lineWidth: 0,
		strokeStyle: '',
	} as unknown as RecordingContext
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(recordingCtx)
	requestPaint = vi.fn()
	// happy-dom's HTMLCanvasElement predates the WICG API
	;(HTMLCanvasElement.prototype as unknown as {requestPaint: unknown}).requestPaint = requestPaint
	// Paint synchronously so tests can assert a deterministic number of paints
	vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
		callback()
		return 0
	})
	vi.stubGlobal('cancelAnimationFrame', vi.fn())
	// happy-dom has no Path2D; the executor only hands instances to ctx.stroke
	vi.stubGlobal(
		'Path2D',
		class {
			constructor(public path?: string) {}
		},
	)
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
	delete (HTMLCanvasElement.prototype as unknown as {requestPaint?: () => void}).requestPaint
})

describe('SankeyCanvas (overlay mode — happy-dom has no HTML-in-Canvas API)', () => {
	it('renders the frame, overlay labels, caption and footnote', () => {
		const wrapper = mount(SankeyCanvas, {props: appProps})

		expect(wrapper.find('[data-mode="overlay"]').exists()).toBe(true)
		expect(wrapper.findAll('.sc-frame')).toHaveLength(1)
		expect(wrapper.findAll('.sc-overlay .sc-label')).toHaveLength(49)
		expect(wrapper.find('.sc-caption').text()).toContain('49 nodes · 41 dependencies')
		expect(wrapper.find('.sc-caption .sc-mode').text()).toContain('chrome://flags/#canvas-draw-element')

		// Overlay labels are percentage-positioned by the scene
		const first = wrapper.find('.sc-overlay .sc-label')
		expect(first.attributes('style')).toContain('%')
		wrapper.unmount()
	})

	it('strokes all 41 links at rest with the shared constants', async () => {
		const wrapper = mount(SankeyCanvas, {props: appProps})
		await flushPromises()

		expect(strokes).toHaveLength(41)
		expect(recordingCtx.globalCompositeOperation).toBe('multiply')
		expect(strokes.every((stroke) => stroke.strokeStyle === '#DBDBDB')).toBe(true)
		expect(strokes.every((stroke) => stroke.lineWidth === 1)).toBe(true)
		wrapper.unmount()
	})

	it('re-strokes with the highlight constants while a label is hovered', async () => {
		const wrapper = mount(SankeyCanvas, {props: appProps})
		await flushPromises()

		strokes.length = 0
		const label = findLabel(wrapper, 'n9::n3')
		await label.trigger('pointerenter')
		await flushPromises()

		expect(strokes).toHaveLength(41)
		const emphasized = strokes.filter((stroke) => stroke.strokeStyle === '#1F1D3D')
		expect(emphasized).toHaveLength(5)
		expect(emphasized.every((stroke) => stroke.lineWidth === 1.2)).toBe(true)
		// Emphasis paints last: the tail of the stroke order is exactly the
		// emphasized set
		expect(strokes.slice(-5)).toEqual(emphasized)
		expect(label.classes()).toContain('sc-label--active')
		wrapper.unmount()
	})

	it('clears emphasis when the pointer leaves', async () => {
		const wrapper = mount(SankeyCanvas, {props: appProps})
		await flushPromises()

		const label = findLabel(wrapper, 'n9::n3')
		await label.trigger('pointerenter')
		await flushPromises()

		strokes.length = 0
		await label.trigger('pointerleave')
		await flushPromises()

		// The leave repaint strokes everything at rest again
		expect(strokes.every((stroke) => stroke.strokeStyle === '#DBDBDB')).toBe(true)
		expect(strokes.every((stroke) => stroke.lineWidth === 1)).toBe(true)
		expect(label.classes()).not.toContain('sc-label--active')
		wrapper.unmount()
	})

	// The empty-data state in the template is intentionally not unit-tested:
	// d3-sankey throws on an empty graph before the component renders, exactly
	// as the SVG Sankey does through the same shared layout composable — and
	// that composable is protected from modification by the parity constraint.
})

describe('SankeyCanvas (HTML-in-Canvas mode — API stubbed on the prototypes)', () => {
	beforeEach(() => {
		// Mount-time detection reads the constructor off the window; the
		// recording context itself is what receives the draw calls
		vi.stubGlobal('CanvasRenderingContext2D', {prototype: {drawElementImage: () => {}}})
	})

	it('renders labels as drawable children of the layoutsubtree canvas', () => {
		const wrapper = mount(SankeyCanvas, {props: appProps})

		expect(wrapper.find('[data-mode="html-in-canvas"]').exists()).toBe(true)
		const canvas = wrapper.find('canvas')
		expect(canvas.attributes('layoutsubtree')).toBeDefined()
		expect(canvas.findAll('.sc-label')).toHaveLength(49)
		// Every label is a DIRECT child carrying the drawable attribute
		expect(canvas.element.children).toHaveLength(49)
		expect(
			Array.from(canvas.element.children).every((child) => child.hasAttribute('drawable')),
		).toBe(true)
		wrapper.unmount()
	})

	it('draws all labels inside the paint event with finite coordinates', async () => {
		const wrapper = mount(SankeyCanvas, {props: appProps})
		await flushPromises()

		wrapper.find('canvas').element.dispatchEvent(new Event('paint'))

		expect(recordingCtx.drawElementImage).toHaveBeenCalledTimes(49)
		for (const call of recordingCtx.drawElementImage.mock.calls) {
			const [element, x, y] = call as [Element, number, number]
			expect(element).toBeInstanceOf(HTMLElement)
			expect(Number.isFinite(x)).toBe(true)
			expect(Number.isFinite(y)).toBe(true)
		}
		wrapper.unmount()
	})

	it('requests another paint when the first snapshot is missing and does not throw', () => {
		recordingCtx.drawElementImage.mockImplementationOnce(() => {
			throw new Error('no snapshot yet')
		})
		const wrapper = mount(SankeyCanvas, {props: appProps})

		const before = requestPaint.mock.calls.length
		expect(() => wrapper.find('canvas').element.dispatchEvent(new Event('paint'))).not.toThrow()
		expect(requestPaint.mock.calls.length).toBeGreaterThan(before)
		wrapper.unmount()
	})
})

function findLabel(wrapper: VueWrapper, text: string) {
	const label = wrapper.findAll('.sc-label').find((node) => node.text() === text)
	expect(label, `label ${text}`).toBeDefined()
	if (!label) throw new Error(`label ${text} not found`)
	return label
}
