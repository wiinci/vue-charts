import {flushPromises, mount, type VueWrapper} from '@vue/test-utils'
import {ref} from 'vue'
import type {Ref} from 'vue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import sankeyJsonData from '@/data/edges2.json'
import type {SankeyLink} from '@/composables/useNodesAndLinks'
import {createLinkSweep} from '@/composables/sankeyCanvasAnimation'
import {useSankeyCanvasScene} from '@/composables/useSankeyCanvasScene'
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
	lineWidth: number
	path?: unknown
	strokeStyle: string
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
		stroke: vi.fn((path?: unknown) => {
			strokes.push({path, strokeStyle: recordingCtx.strokeStyle as string, lineWidth: recordingCtx.lineWidth})
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

// Every mount runs with the animation gate off unless a test turns it on —
// the route's view provides the gate in the real app, and happy-dom's
// synchronous rAF stub would recurse on the animation loop otherwise
const mountCanvas = (props: typeof appProps = appProps, animationsEnabled: Ref<boolean> = ref(false)) =>
	mount(SankeyCanvas, {props, global: {provide: {animationsEnabled}}})

describe('SankeyCanvas (overlay mode — happy-dom has no HTML-in-Canvas API)', () => {
	it('renders the frame, overlay labels, caption and footnote', () => {
		const wrapper = mountCanvas()

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

	it('publishes the layout-to-CSS scale so labels track the chart like SVG user units', () => {
		const wrapper = mountCanvas()

		// At the design width the scale is 1, i.e. the SVG's own 12px labels
		expect(wrapper.find('.sc-frame').attributes('style')).toContain('--sc-scale: 1')
		wrapper.unmount()
	})

	it('strokes all 41 links at rest with the shared constants', async () => {
		const wrapper = mountCanvas()
		await flushPromises()

		expect(strokes).toHaveLength(41)
		expect(recordingCtx.globalCompositeOperation).toBe('multiply')
		expect(strokes.every((stroke) => stroke.strokeStyle === '#DBDBDB')).toBe(true)
		expect(strokes.every((stroke) => stroke.lineWidth === 1)).toBe(true)
		wrapper.unmount()
	})

	it('re-strokes with the highlight constants while a label is hovered', async () => {
		const wrapper = mountCanvas()
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
		const wrapper = mountCanvas()
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

describe('collapse (spec V16 — click the label, the SVG useCollapsed hides the subtree)', () => {
	it('hides the n9::n3 subtree with frozen positions and re-expands on a second click', async () => {
		const wrapper = mountCanvas()
		await flushPromises()
		strokes.length = 0 // drop the mount paint — only collapse repaints count here

		const frame = wrapper.find('.sc-frame')
		const caption = wrapper.find('.sc-caption')
		expect(frame.attributes('aria-label')).toBe('Dependency graph: 49 nodes, 41 links')
		expect(caption.text()).toContain('49 nodes · 41 dependencies')

		// Every label's frozen position, captured before the collapse
		const positionsBefore = new Map<string, string | undefined>()
		for (const label of wrapper.findAll('.sc-overlay .sc-label')) {
			positionsBefore.set(label.text(), label.attributes('style'))
		}

		await findLabel(wrapper, 'n9::n3').trigger('click')
		await flushPromises()

		// 41→36 links, 49→44 labels — exactly the reference collapse
		expect(frame.attributes('aria-label')).toBe('Dependency graph: 44 nodes, 36 links')
		expect(caption.text()).toContain('44 nodes · 36 dependencies')
		expect(wrapper.findAll('.sc-overlay .sc-label')).toHaveLength(44)
		const visibleIds = wrapper.findAll('.sc-overlay .sc-label').map((label) => label.text())
		expect(visibleIds).toContain('n9::n3') // the collapsed root stays
		for (const id of ['n10::n3', 'n4::n3', 'n11::n2', 'n2::n2', 'n6::n2']) {
			expect(visibleIds).not.toContain(id)
		}

		// No relayout: every surviving label keeps its exact frozen position —
		// the vacated space stays empty
		for (const label of wrapper.findAll('.sc-overlay .sc-label')) {
			expect(label.attributes('style'), label.text()).toBe(positionsBefore.get(label.text()))
		}

		// Links repainted without the hidden subtree
		expect(strokes).toHaveLength(36)

		// A second click re-expands the same subtree
		strokes.length = 0
		await findLabel(wrapper, 'n9::n3').trigger('click')
		await flushPromises()
		expect(frame.attributes('aria-label')).toBe('Dependency graph: 49 nodes, 41 links')
		expect(caption.text()).toContain('49 nodes · 41 dependencies')
		expect(wrapper.findAll('.sc-overlay .sc-label')).toHaveLength(49)
		for (const label of wrapper.findAll('.sc-overlay .sc-label')) {
			expect(label.attributes('style'), label.text()).toBe(positionsBefore.get(label.text()))
		}
		expect(strokes).toHaveLength(41)
		wrapper.unmount()
	})

	it('keeps hover working on the visible subset after a collapse', async () => {
		const wrapper = mountCanvas()
		await flushPromises()
		await findLabel(wrapper, 'n9::n3').trigger('click')
		await flushPromises()

		// Hovering the collapsed root: its 5 links are hidden — nothing to
		// highlight, as in the SVG
		strokes.length = 0
		await findLabel(wrapper, 'n9::n3').trigger('pointerenter')
		await flushPromises()
		expect(strokes).toHaveLength(36)
		expect(strokes.every((stroke) => stroke.strokeStyle === '#DBDBDB')).toBe(true)
		expect(findLabel(wrapper, 'n9::n3').classes()).toContain('sc-label--active')

		// Hovering a visible neighbour still highlights its visible upstream —
		// n10::n2→n4::n2 and n9::n2→n10::n2 (the reference hover set for n4::n2)
		strokes.length = 0
		await findLabel(wrapper, 'n4::n2').trigger('pointerenter')
		await flushPromises()
		const emphasized = strokes.filter((stroke) => stroke.strokeStyle === '#1F1D3D')
		expect(emphasized).toHaveLength(2)
		expect(emphasized.every((stroke) => stroke.lineWidth === 1.2)).toBe(true)
		wrapper.unmount()
	})
})

describe('entrance animation (spec V17 — the gate on at mount, stepped frames)', () => {
	const rafQueue: Array<FrameRequestCallback> = []
	let nowMs = 1000

	const step = (ms: number) => {
		nowMs += ms
		for (const callback of rafQueue.splice(0)) callback(nowMs)
	}

	beforeEach(() => {
		nowMs = 1000
		rafQueue.length = 0
		// Frames advance only when a test steps the queue — deterministic timing
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			rafQueue.push(callback)
			return rafQueue.length
		})
		vi.spyOn(performance, 'now').mockImplementation(() => nowMs)
	})

	it('sweeps links out of their source points with the SVG delay curve', async () => {
		const planned = useSankeyCanvasScene(appProps).scene.value
		const depth0 = planned.links.filter((link) => link.depth === 0)
		expect(depth0.length).toBeGreaterThan(0)

		const wrapper = mountCanvas(appProps, ref(true))
		await flushPromises()

		// The mount queued one paint and one animation tick; run them at t0
		step(0)
		strokes.length = 0

		// +150ms: depth-0 sources are mid-sweep (delay 100, 50 into a 100ms
		// ease); everything deeper still sits on its flat source line
		step(150)
		expect(strokes).toHaveLength(41)
		const flat = strokes.filter((stroke) => isFlatSourcePath(pathText(stroke)))
		expect(flat).toHaveLength(41 - depth0.length)
		// The mid-sweep path is d3's own interpolation: interpolateString(
		// initialPath, finalPath)(0.5), as d3-transition renders the `d`
		const expectedMid = createLinkSweep(depth0[0].initialPath, depth0[0].path, 0, 0).interpolate(0.5)
		expect(strokes.map(pathText)).toContain(expectedMid)

		// Labels fade with the same stagger — depth 0 mid-fade, depth 3 untouched
		const depth0Label = planned.labels.find((label) => label.depth === 0)
		expect(depth0Label).toBeDefined()
		const midLabel = findLabelEl(wrapper, depth0Label!.id)
		expect(Number(midLabel.style.opacity)).toBeCloseTo(0.5, 4)
		const deepLabel = findLabelEl(wrapper, planned.labels.find((label) => label.depth === 3)!.id)
		expect(deepLabel.style.opacity).toBe(String(1e-9))

		// +450ms more (t0+600): every delay (≤400) and duration has elapsed —
		// all links settle on their exact final paths, labels at full opacity
		strokes.length = 0
		step(450)
		expect(strokes).toHaveLength(41)
		const finalPaths = new Set(planned.links.map((link) => link.path))
		for (const stroke of strokes) {
			expect(finalPaths.has(pathText(stroke)), pathText(stroke)).toBe(true)
		}
		expect(deepLabel.style.opacity).toBe('1')
		wrapper.unmount()
	})

	it('sweeps hidden links back to their source lines and fades their labels on collapse', async () => {
		const wrapper = mountCanvas(appProps, ref(true))
		await flushPromises()
		step(0)
		strokes.length = 0
		step(600) // t0+600: the entrance has fully settled
		strokes.length = 0

		const finalPaths = new Set(useSankeyCanvasScene(appProps).scene.value.links.map((link) => link.path))
		await findLabel(wrapper, 'n9::n3').trigger('click')
		await flushPromises()

		// The scene moves immediately (aria + caption), the exits begin
		expect(wrapper.find('.sc-frame').attributes('aria-label')).toBe('Dependency graph: 44 nodes, 36 links')
		expect(wrapper.findAll('.sc-overlay .sc-label')).toHaveLength(49) // 44 visible + 5 still fading

		// Drain the click's queued paint + tick, then time the exits. The
		// reverse stagger runs over LINK source depths (max 2 in this data —
		// Links.vue:139): the four depth-1 exits sweep t0+700→800, the
		// depth-0 exit t0+800→900
		step(0)

		// Exits fade without delay: a hidden label sits at half opacity 50ms in
		step(50) // t0+650
		const hidden = findLabelEl(wrapper, 'n10::n3')
		expect(Number(hidden.style.opacity)).toBeCloseTo(0.5, 4)

		// +100ms: the fades finish — the SVG's exit transition removes the elements
		step(50) // t0+700
		await flushPromises()
		expect(wrapper.findAll('.sc-overlay .sc-label')).toHaveLength(44)

		// t0+750: the depth-1 exits are mid-sweep back to their source lines;
		// the depth-0 exit still sits on its final path (delay 200)
		strokes.length = 0
		step(50)
		expect(strokes).toHaveLength(41)
		const mid = strokes.filter((stroke) => !finalPaths.has(pathText(stroke)))
		expect(mid).toHaveLength(4)

		// t0+850: the depth-1 exits are pruned, the depth-0 exit is mid-sweep
		strokes.length = 0
		step(100)
		expect(strokes).toHaveLength(37)
		expect(strokes.filter((stroke) => !finalPaths.has(pathText(stroke)))).toHaveLength(1)

		// t0+950: every exit finished — the subtree is gone
		strokes.length = 0
		step(100)
		expect(strokes).toHaveLength(36)
		expect(strokes.every((stroke) => finalPaths.has(pathText(stroke)))).toBe(true)
		wrapper.unmount()
	})

	it('re-expands with the SVG staggered re-entry animation', async () => {
		const wrapper = mountCanvas(appProps, ref(true))
		await flushPromises()
		step(0)
		strokes.length = 0
		step(600)
		await findLabel(wrapper, 'n9::n3').trigger('click')
		await flushPromises()
		step(400) // t0+1000: the collapse exits have fully finished
		await flushPromises()

		const finalPaths = new Set(useSankeyCanvasScene(appProps).scene.value.links.map((link) => link.path))
		await findLabel(wrapper, 'n9::n3').trigger('click')
		await flushPromises()
		expect(wrapper.find('.sc-frame').attributes('aria-label')).toBe('Dependency graph: 49 nodes, 41 links')

		// Drain the click's queued paint + tick, then time the re-entry: the
		// forward stagger runs over source depths — the depth-0 source sweeps
		// t0+100→200, the four depth-1 sources t0+200→300
		step(0)
		strokes.length = 0

		// t0+150: the depth-0 source is mid-sweep, the four depth-1 sources
		// still flat on their initial lines
		step(150)
		expect(strokes).toHaveLength(41)
		const flats = strokes.filter((stroke) => isFlatSourcePath(pathText(stroke)))
		expect(flats).toHaveLength(4)
		await flushPromises()
		expect(wrapper.findAll('.sc-overlay .sc-label')).toHaveLength(49)

		// Re-entered labels start at the SVG's 1e-9 (n10::n3 is depth 1: delay 200)
		const reentered = findLabelEl(wrapper, 'n10::n3')
		expect(reentered.style.opacity).toBe(String(1e-9))

		// t0+650 after the click: everything settled on the exact final geometry
		strokes.length = 0
		step(500)
		expect(strokes).toHaveLength(41)
		expect(strokes.every((stroke) => finalPaths.has(pathText(stroke)))).toBe(true)
		expect(reentered.style.opacity).toBe('1')
		wrapper.unmount()
	})
})

describe('SankeyCanvas (HTML-in-Canvas mode — API stubbed on the prototypes)', () => {
	beforeEach(() => {
		// Mount-time detection reads the constructor off the window; the
		// recording context itself is what receives the draw calls
		vi.stubGlobal('CanvasRenderingContext2D', {prototype: {drawElementImage: () => {}}})
	})

	it('renders labels as drawable children of the layoutsubtree canvas', () => {
		const wrapper = mountCanvas()

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
		const wrapper = mountCanvas()
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

	it('parks each label over its painted pixels with the returned matrix', async () => {
		recordingCtx.drawElementImage.mockReturnValue({
			toString: () => 'matrix(1, 0, 0, 1, 5, 7)',
		} as unknown as DOMMatrix)
		const wrapper = mountCanvas()
		await flushPromises()

		wrapper.find('canvas').element.dispatchEvent(new Event('paint'))

		// Hit-testing, focus and find-in-page have to land on the drawn glyphs
		expect(findLabelEl(wrapper, 'n9::n3').style.transform).toBe('matrix(1, 0, 0, 1, 5, 7)')
		wrapper.unmount()
	})

	it('requests another paint when the first snapshot is missing and does not throw', () => {
		recordingCtx.drawElementImage.mockImplementationOnce(() => {
			throw new Error('no snapshot yet')
		})
		const wrapper = mountCanvas()

		const before = requestPaint.mock.calls.length
		expect(() => wrapper.find('canvas').element.dispatchEvent(new Event('paint'))).not.toThrow()
		expect(requestPaint.mock.calls.length).toBeGreaterThan(before)
		wrapper.unmount()
	})

	it('hides the collapsed subtree in the bitmap: 44 drawable labels on the next paint', async () => {
		const wrapper = mountCanvas()
		await flushPromises()

		await findLabel(wrapper, 'n9::n3').trigger('click')
		await flushPromises()

		expect(wrapper.find('canvas').findAll('.sc-label')).toHaveLength(44)
		expect(wrapper.find('.sc-caption').text()).toContain('44 nodes · 36 dependencies')

		recordingCtx.drawElementImage.mockClear()
		wrapper.find('canvas').element.dispatchEvent(new Event('paint'))
		expect(recordingCtx.drawElementImage).toHaveBeenCalledTimes(44)
		wrapper.unmount()
	})

	it('drives repaints through requestPaint while an animation runs', async () => {
		const rafQueue: Array<FrameRequestCallback> = []
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			rafQueue.push(callback)
			return rafQueue.length
		})
		const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000)
		const wrapper = mountCanvas(appProps, ref(true))
		await flushPromises()

		const before = requestPaint.mock.calls.length
		nowSpy.mockReturnValue(1010)
		rafQueue.splice(0).forEach((callback) => callback(1010))
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

function findLabelEl(wrapper: VueWrapper, text: string): HTMLElement {
	return findLabel(wrapper, text).element as HTMLElement
}

/** The Path2D stub's source string */
function pathText(stroke: StrokeRecord): string {
	return (stroke.path as {path?: string} | undefined)?.path ?? ''
}

/** The flat source line: 8 numbers that are just the source node's x0/y0 */
function isFlatSourcePath(path: string): boolean {
	const numbers = path.match(/-?\d+(?:\.\d+)?/g) ?? []
	return numbers.length === 8 && new Set(numbers).size <= 2
}
