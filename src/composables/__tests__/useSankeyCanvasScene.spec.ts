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
