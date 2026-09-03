import {ref} from 'vue'
import {describe, expect, it} from 'vitest'
import sankeyJsonData from '@/data/edges2.json'
import {type SankeyLink, type SankeyProps, useNodesAndLinks} from '../useNodesAndLinks'
import {useSankeyCanvasScene} from '../useSankeyCanvasScene'

// The home page's exact configuration — the geometry baseline's props
const appProps: SankeyProps = {
	data: sankeyJsonData.map((item) => ({...item, value: 1})) as SankeyLink[],
	height: 480,
	marginLeft: 20,
	marginRight: 20,
	marginBottom: 20,
	marginTop: 20,
	nodeAlign: 'justify',
	nodeId: 'id',
	nodePadding: 1e9,
	nodeWidth: 1e-9,
	sort: false,
	width: 960,
}

// The 5 links the reference hover screenshot records for n9::n3
const N9_N3_HIGHLIGHT = [
	'n9::n3-n10::n3',
	'n10::n3-n4::n3',
	'n10::n3-n11::n2',
	'n10::n3-n2::n2',
	'n10::n3-n6::n2',
]

describe('useSankeyCanvasScene', () => {
	it('reproduces the SVG scene sizes: 49 labels, 41 links', () => {
		const {scene} = useSankeyCanvasScene(appProps)

		expect(scene.value.labels).toHaveLength(49)
		expect(scene.value.links).toHaveLength(41)
		expect(scene.value.width).toBe(960)
		expect(scene.value.height).toBe(480)
		expect(scene.value.hoveredId).toBe('')
	})

	it('places labels exactly where useNodesAndLinks puts the nodes', () => {
		const {nodes} = useNodesAndLinks(appProps)
		const {scene} = useSankeyCanvasScene(appProps)
		const byId = new Map(nodes.value.map((node) => [node.id, node]))

		expect(scene.value.labels).toHaveLength(nodes.value.length)
		for (const label of scene.value.labels) {
			const node = byId.get(label.id)
			expect(node, `node ${label.id}`).toBeDefined()
			if (!node) continue
			expect(label.x).toBe(node.x)
			expect(label.y).toBe(node.y + node.height / 2)
		}
	})

	it('anchors labels with the SVG rule at the chart-width midline', () => {
		const {scene} = useSankeyCanvasScene(appProps)
		// Labels.vue receives the chart width (width minus margins)
		const chartMidline = (appProps.width - appProps.marginLeft - appProps.marginRight) / 2

		for (const label of scene.value.labels) {
			expect(label.anchor).toBe(label.x < chartMidline ? 'start' : 'end')
			// The chart-width midline and the spec's width/2 midline agree on this dataset
			expect(label.anchor).toBe(label.x < appProps.width / 2 ? 'start' : 'end')
		}
	})

	it('produces a path for every link', () => {
		const {scene} = useSankeyCanvasScene(appProps)

		for (const link of scene.value.links) {
			expect(link.path.startsWith('M')).toBe(true)
		}
	})

	it('emphasises the reference link set for n9::n3 and paints it last', () => {
		const {scene, setHovered} = useSankeyCanvasScene(appProps)

		setHovered('n9::n3')

		const emphasized = scene.value.links.filter((link) => link.emphasized)
		expect(emphasized.map((link) => link.key).sort()).toEqual([...N9_N3_HIGHLIGHT].sort())
		expect(scene.value.links).toHaveLength(41)
		// Emphasis paints on top: the tail of the draw order is exactly the
		// emphasized set, as raising SVG paths to the end does
		const tail = scene.value.links.slice(-5)
		expect(tail.every((link) => link.emphasized)).toBe(true)
		expect(new Set(tail.map((link) => link.key))).toEqual(new Set(N9_N3_HIGHLIGHT))
	})

	it('marks the hovered and connected labels active and the rest muted', () => {
		const {scene, setHovered} = useSankeyCanvasScene(appProps)
		setHovered('n9::n3')
		const byId = new Map(scene.value.labels.map((label) => [label.id, label]))

		expect(byId.get('n9::n3')?.state).toBe('active')
		expect(byId.get('n10::n3')?.state).toBe('active')
		expect(byId.get('n4::n2')?.state).toBe('muted')
	})

	it('clears emphasis on leave', () => {
		const {scene, setHovered, clearHovered} = useSankeyCanvasScene(appProps)

		setHovered('n9::n3')
		clearHovered()

		expect(scene.value.links.every((link) => !link.emphasized)).toBe(true)
		expect(scene.value.hoveredId).toBe('')
	})

	it('filters the collapsed subtree without touching other geometry', () => {
		// What useCollapsed.toggleCollapse('n9::n3') produces: the root plus the
		// descendants whose incoming sources are all collapsed
		const collapsed = ref(new Set(['n9::n3', 'n10::n3', 'n4::n3', 'n11::n2', 'n2::n2', 'n6::n2']))
		const {scene} = useSankeyCanvasScene(appProps, {collapsedNodes: collapsed})
		const {scene: full} = useSankeyCanvasScene(appProps)

		// Reference collapse counts: 41→36 links, 49→44 labels
		expect(scene.value.links).toHaveLength(36)
		expect(scene.value.labels).toHaveLength(44)
		expect(new Set(scene.value.labels.map((label) => label.id))).not.toContain('n10::n3')
		expect(scene.value.labels.find((label) => label.id === 'n9::n3')).toBeDefined()

		// A scene filter, not a relayout: surviving items are byte-identical
		const fullById = new Map(full.value.labels.map((label) => [label.id, label]))
		for (const label of scene.value.labels) {
			expect(label).toEqual(fullById.get(label.id))
		}
	})
})


// The SVG's own useCollapsed composable drives collapse when the planner
// owns the state (no collapsedNodes option) — the exact path the canvas
// component toggles (spec V16).
describe('planner-owned collapse (the SVG useCollapsed composable)', () => {
	const subtreeIds = ['n10::n3', 'n4::n3', 'n11::n2', 'n2::n2', 'n6::n2']

	it('hides the n9::n3 subtree on toggle with no relayout', () => {
		const {scene, toggleCollapse} = useSankeyCanvasScene(appProps)
		const {scene: full} = useSankeyCanvasScene(appProps)
		if (!toggleCollapse) throw new Error('planner should own useCollapsed when no option is passed')

		// The reference collapse: 41→36 links, 49→44 labels — exactly the
		// subtree the reference recording hides for n9::n3
		toggleCollapse('n9::n3')

		expect(scene.value.links).toHaveLength(36)
		expect(scene.value.labels).toHaveLength(44)
		const linkKeys = new Set(scene.value.links.map((link) => link.key))
		for (const key of N9_N3_HIGHLIGHT) {
			expect(linkKeys.has(key), key).toBe(false)
		}

		// Every surviving item is byte-identical — hide-only, the vacated space
		// stays empty, no relayout
		const fullLinksByKey = new Map(full.value.links.map((link) => [link.key, link]))
		for (const link of scene.value.links) {
			expect(link, `link ${link.key}`).toEqual(fullLinksByKey.get(link.key))
		}
		const fullLabelsById = new Map(full.value.labels.map((label) => [label.id, label]))
		for (const label of scene.value.labels) {
			expect(label, `label ${label.id}`).toEqual(fullLabelsById.get(label.id))
		}

		// The collapsed root itself stays; its subtree hides
		const visibleIds = scene.value.labels.map((label) => label.id)
		expect(visibleIds).toContain('n9::n3')
		for (const id of subtreeIds) {
			expect(visibleIds).not.toContain(id)
		}
	})

	it('re-expands the same subtree on a second toggle with geometry restored', () => {
		const {scene, toggleCollapse} = useSankeyCanvasScene(appProps)
		const {scene: full} = useSankeyCanvasScene(appProps)
		if (!toggleCollapse) throw new Error('planner should own useCollapsed when no option is passed')

		toggleCollapse('n9::n3')
		toggleCollapse('n9::n3')

		expect(scene.value.links).toHaveLength(41)
		expect(scene.value.labels).toHaveLength(49)
		const fullLinksByKey = new Map(full.value.links.map((link) => [link.key, link]))
		for (const link of scene.value.links) {
			expect(link, `link ${link.key}`).toEqual(fullLinksByKey.get(link.key))
		}
		const fullLabelsById = new Map(full.value.labels.map((label) => [label.id, label]))
		for (const label of scene.value.labels) {
			expect(label, `label ${label.id}`).toEqual(fullLabelsById.get(label.id))
		}
	})

	it('carries the SVG animation geometry: flat initial paths and source depths', () => {
		const {scene} = useSankeyCanvasScene(appProps)
		const {nodes} = useNodesAndLinks(appProps)
		const byId = new Map(nodes.value.map((node) => [node.id, node]))

		// Links.vue's initialLinkAccessor: linkHorizontal with both generator
		// endpoints at the source node — 8 numbers that are just x0/y0
		let curved = 0
		for (const link of scene.value.links) {
			const [sourceId] = link.key.split('-')
			const source = byId.get(sourceId)
			expect(source, sourceId).toBeDefined()
			if (!source) continue
			const numbers = link.initialPath.match(/-?\d+(?:\.\d+)?/g) ?? []
			expect(numbers).toHaveLength(8)
			expect(new Set(numbers).size).toBeLessThanOrEqual(2)
			// The anchor is the source node at 2-decimal rounding. A ±0.01
			// tolerance absorbs the toFixed boundary (and the shared-data
			// mutation the SVG's own generators are equally subject to)
			const [anchorX, anchorY] = numbers
			expect(Math.abs(parseFloat(anchorX ?? 'NaN') - (source.x0 as number))).toBeLessThanOrEqual(0.02)
			expect(Math.abs(parseFloat(anchorY ?? 'NaN') - (source.y0 as number))).toBeLessThanOrEqual(0.02)
			// The entrance sweeps FROM this flat line TO the final curve
			if (link.initialPath !== link.path) curved += 1
			// Links.vue's getLinkDepth: the source node's layout depth
			expect(link.depth).toBe(source.depth || 0)
			expect(link.depth).toBeGreaterThanOrEqual(0)
			expect(link.depth).toBeLessThanOrEqual(3)
		}
		// The flat lines really are starting points: (nearly) every link curves
		expect(curved).toBeGreaterThan(35)

		// The reference-recorded flat line for the n9::n3 source (baseline
		// document, collapse captures): byte-identical anchor and geometry
		const reference = scene.value.links.find((link) => link.key === 'n9::n3-n10::n3')
		expect(reference?.initialPath).toBe('M20,342.33C20,342.33,20,342.33,20,342.33')
	})

	it('carries node depths for the label delay curve', () => {
		const {scene} = useSankeyCanvasScene(appProps)
		const {nodes} = useNodesAndLinks(appProps)
		const byId = new Map(nodes.value.map((node) => [node.id, node]))

		// Labels.vue's (d.depth || 0)
		for (const label of scene.value.labels) {
			const node = byId.get(label.id)
			expect(node, label.id).toBeDefined()
			if (!node) continue
			expect(label.depth).toBe(node.depth || 0)
		}
	})
})
