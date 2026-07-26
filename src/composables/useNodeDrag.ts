import {ref} from 'vue'
import {SankeyLink, SankeyNode} from './useNodesAndLinks'

export interface Position {
	x: number
	y: number
}

export function useNodeDrag() {
	// Map storing pinned positions: nodeId -> { x, y }
	const pinnedPositions = ref<Map<string, Position>>(new Map())
	const initialDragNodePos = ref<{x: number; y: number} | null>(null)

	function pinNode(id: string, pos: Position) {
		const nextMap = new Map(pinnedPositions.value)
		nextMap.set(id, pos)
		pinnedPositions.value = nextMap
	}

	function unpinNode(id: string) {
		if (!pinnedPositions.value.has(id)) return
		const nextMap = new Map(pinnedPositions.value)
		nextMap.delete(id)
		pinnedPositions.value = nextMap
	}

	function unpinAll() {
		pinnedPositions.value = new Map()
	}

	function startDragNode(node: SankeyNode) {
		initialDragNodePos.value = {
			x: node.x ?? 0,
			y: node.y ?? 0,
		}
	}

	function updateDragNode(nodeId: string, delta: {dx: number; dy: number}) {
		if (!initialDragNodePos.value) return

		const newX = initialDragNodePos.value.x + delta.dx
		const newY = initialDragNodePos.value.y + delta.dy

		pinNode(nodeId, {x: newX, y: newY})
	}

	function endDragNode() {
		initialDragNodePos.value = null
	}

	/**
	 * Apply pinned position overrides onto calculated layout nodes.
	 * Updates node bounds (x, y, x0, x1, y0, y1) and recalculates connected links.
	 */
	function applyNodePositions(nodes: SankeyNode[], _links?: SankeyLink[]): SankeyNode[] {
		if (!pinnedPositions.value.size) return nodes

		return nodes.map((node) => {
			const pinned = pinnedPositions.value.get(node.id)
			if (!pinned) return node

			const origX0 = node.x0 ?? node.x ?? 0
			const origX1 = node.x1 ?? (node.x ?? 0) + (node.width ?? 0)
			const origY0 = node.y0 ?? node.y ?? 0
			const origY1 = node.y1 ?? (node.y ?? 0) + (node.height ?? 0)

			const width = node.width ?? origX1 - origX0
			const height = node.height ?? origY1 - origY0

			const updatedNode: SankeyNode = {
				...node,
				x: pinned.x,
				y: pinned.y,
				x0: pinned.x,
				x1: pinned.x + width,
				y0: pinned.y,
				y1: pinned.y + height,
			}

			// Update connected link source/target references if present
			if (node.sourceLinks) {
				node.sourceLinks.forEach((link) => {
					if (typeof link.source === 'object') {
						link.source.x1 = updatedNode.x1
						link.source.y0 = updatedNode.y0
						link.source.y1 = updatedNode.y1
					}
				})
			}
			if (node.targetLinks) {
				node.targetLinks.forEach((link) => {
					if (typeof link.target === 'object') {
						link.target.x0 = updatedNode.x0
						link.target.y0 = updatedNode.y0
						link.target.y1 = updatedNode.y1
					}
				})
			}

			return updatedNode
		})
	}

	return {
		pinnedPositions,
		pinNode,
		unpinNode,
		unpinAll,
		startDragNode,
		updateDragNode,
		endDragNode,
		applyNodePositions,
	}
}
