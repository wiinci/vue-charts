import {describe, expect, it} from 'vitest'
import {useNodeDrag} from '../useNodeDrag'
import {SankeyLink, SankeyNode} from '../useNodesAndLinks'

describe('useNodeDrag', () => {
	const createNode = (id: string, x = 10, y = 20, width = 15, height = 50): SankeyNode => ({
		id,
		x0: x,
		x1: x + width,
		y0: y,
		y1: y + height,
		x,
		y,
		width,
		height,
		value: 10,
		sourceLinks: [],
		targetLinks: [],
	})

	it('pins and unpins node positions', () => {
		const {pinnedPositions, pinNode, unpinNode, unpinAll} = useNodeDrag()

		expect(pinnedPositions.value.size).toBe(0)

		pinNode('node-1', {x: 100, y: 200})
		expect(pinnedPositions.value.get('node-1')).toEqual({x: 100, y: 200})

		unpinNode('node-1')
		expect(pinnedPositions.value.has('node-1')).toBe(false)

		pinNode('node-1', {x: 100, y: 200})
		pinNode('node-2', {x: 300, y: 400})
		expect(pinnedPositions.value.size).toBe(2)

		unpinAll()
		expect(pinnedPositions.value.size).toBe(0)
	})

	it('updates node coordinates when drag moves', () => {
		const {pinnedPositions, startDragNode, updateDragNode} = useNodeDrag()
		const node = createNode('node-1', 10, 20)

		startDragNode(node)
		updateDragNode('node-1', {dx: 15, dy: 25})

		expect(pinnedPositions.value.get('node-1')).toEqual({x: 25, y: 45})
	})

	it('applies pinned position overrides onto node dataset', () => {
		const {pinNode, applyNodePositions} = useNodeDrag()
		const nodes = [createNode('node-1', 10, 20), createNode('node-2', 100, 200)]
		const links: SankeyLink[] = []

		pinNode('node-1', {x: 50, y: 60})

		const updatedNodes = applyNodePositions(nodes, links)
		const updated1 = updatedNodes.find((n) => n.id === 'node-1')
		const updated2 = updatedNodes.find((n) => n.id === 'node-2')

		expect(updated1?.x).toBe(50)
		expect(updated1?.y).toBe(60)
		expect(updated1?.x1).toBe(65) // 50 + width(15)

		expect(updated2?.x).toBe(100) // Unpinned stays default
		expect(updated2?.y).toBe(200)
	})
})
