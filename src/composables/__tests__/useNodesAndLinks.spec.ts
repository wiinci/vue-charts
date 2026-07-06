import sankeyJsonData from '@/data/edges2.json'
import {describe, expect, it} from 'vitest'
import {reactive} from 'vue'
import {SankeyLink, SankeyProps, useNodesAndLinks} from '../useNodesAndLinks'

const getNodeId = (node: SankeyLink['source'] | SankeyLink['target']) =>
	typeof node === 'object' ? node.id : String(node)

describe('useNodesAndLinks', () => {
	const mockData: SankeyLink[] = [
		{source: 'A', target: 'B', value: 10},
		{source: 'B', target: 'C', value: 5},
		{source: 'B', target: 'D', value: 5},
	]

	const defaultProps: SankeyProps = {
		data: mockData,
		height: 600,
		width: 800,
		marginLeft: 10,
		marginRight: 10,
		marginTop: 10,
		marginBottom: 10,
		nodeAlign: 'justify',
		nodeId: 'id',
		nodePadding: 20,
		nodeWidth: 10,
		sort: false,
	}

	it('computes chart dimensions correctly', () => {
		const props = reactive({...defaultProps})
		const {chartWidth, chartHeight} = useNodesAndLinks(props)

		expect(chartWidth.value).toBe(800 - 10 - 10) // 780
		expect(chartHeight.value).toBe(600 - 10 - 10) // 580

		// Test reactivity
		props.width = 1000
		expect(chartWidth.value).toBe(1000 - 10 - 10) // 980
	})

	it('generates nodes and links structure', () => {
		const props = reactive({...defaultProps})
		const {nodes, links} = useNodesAndLinks(props)

		// Nodes should be created for A, B, C, D
		expect(nodes.value.length).toBe(4)
		const nodeIds = nodes.value.map((n) => n.id).sort()
		expect(nodeIds).toEqual(['A', 'B', 'C', 'D'])

		// Links should be preserved
		expect(links.value.length).toBe(3)
		expect(links.value[0].value).toBe(10)
	})

	it('reacts to data changes', () => {
		const props = reactive({...defaultProps})
		const {nodes} = useNodesAndLinks(props)

		expect(nodes.value.length).toBe(4)

		const newData = [{source: 'X', target: 'Y', value: 20}]
		props.data = newData

		expect(nodes.value.length).toBe(2)
	})

	it('preserves current app sankey geometry values', () => {
		const props = reactive<SankeyProps>({
			data: sankeyJsonData.map((item) => ({...item, value: 1})) as SankeyLink[],
			height: 480,
			width: 960,
			marginLeft: 20,
			marginRight: 20,
			marginTop: 20,
			marginBottom: 20,
			nodeAlign: 'justify',
			nodeId: 'id',
			nodePadding: 1e9,
			nodeWidth: 1e-9,
			sort: false,
		})

		const {nodes, links} = useNodesAndLinks(props)

		expect(nodes.value).toHaveLength(49)
		expect(links.value).toHaveLength(41)
		expect(nodes.value.every((node) => node.height === 0)).toBe(true)
		expect(links.value.every((link) => (link.width ?? 0) === 0)).toBe(true)

		const uniqueNodeWidths = Array.from(new Set(nodes.value.map((node) => node.width))).sort(
			(a, b) => a - b,
		)
		expect(uniqueNodeWidths).toHaveLength(2)
		expect(uniqueNodeWidths[0]).toBeCloseTo(9.999894245993346e-10, 20)
		expect(uniqueNodeWidths[1]).toBeCloseTo(1.000000082740371e-9, 20)

		expect(
			nodes.value.slice(0, 3).map((node) => ({
				id: node.id,
				x0: node.x0,
				x1: node.x1,
				y0: node.y0,
				y1: node.y1,
				width: node.width,
				height: node.height,
			})),
		).toEqual([
			{
				id: 'n9::n3',
				x0: 20,
				x1: 20.000000001,
				y0: 342.33446784494924,
				y1: 342.33446784494924,
				width: 1.000000082740371e-9,
				height: 0,
			},
			{
				id: 'n10::n3',
				x0: 326.66666666633336,
				x1: 326.66666666733335,
				y0: 342.3669121276552,
				y1: 342.3669121276552,
				width: 9.999894245993346e-10,
				height: 0,
			},
			{
				id: 'n10::n2',
				x0: 326.66666666633336,
				x1: 326.66666666733335,
				y0: 132.63809266964822,
				y1: 132.63809266964822,
				width: 9.999894245993346e-10,
				height: 0,
			},
		])

		expect(
			links.value.slice(0, 3).map((link) => ({
				source: getNodeId(link.source),
				target: getNodeId(link.target),
				width: link.width,
				y0: link.y0,
				y1: link.y1,
			})),
		).toEqual([
			{
				source: 'n9::n3',
				target: 'n10::n3',
				width: 0,
				y0: 342.33446784494924,
				y1: 342.3669121276552,
			},
			{
				source: 'n10::n2',
				target: 'n4::n2',
				width: 0,
				y0: 132.63809266964822,
				y1: 87.69230769230768,
			},
			{
				source: 'n10::n5',
				target: 'n4::n5',
				width: 0,
				y0: 232.9776343102234,
				y1: 206.15384615384633,
			},
		])
	})
})
