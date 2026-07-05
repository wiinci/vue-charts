import { ref, Ref } from 'vue'
import { SankeyLink, SankeyNode } from './useNodesAndLinks'
import {
	getLinkSourceId,
	getLinkTargetId,
	traverseConnectedNodes,
} from './sankeyTraversal'

interface HighlightOptions<T> {
	trueValue: T
	falseValue: T
}

export function useHighlightLinks(labelHoverId: Ref<string>, collapsedNodes: Ref<Set<string>>) {
	// Collections for sources and targets as refs
	const sourceIds = ref(new Set<string>())
	const targetIds = ref(new Set<string>())
	const emptyNodeLookup = new Map<string, SankeyNode>()

	// Generic traversal helper: traverses links on a node using the provided linkKey
	function traverse(
		node: SankeyNode,
		linkKey: 'targetLinks' | 'sourceLinks',
		addId: (id: string) => void,
	) {
		traverseConnectedNodes(
			node,
			linkKey,
			emptyNodeLookup,
			(nextNode) => addId(nextNode.id),
			(nextNode) => !collapsedNodes.value.has(nextNode.id),
		)
	}

	/**
	 * Collect all upstream sources of a node
	 */
	function collectTargets(node: SankeyNode) {
		traverse(node, 'targetLinks', (id) => sourceIds.value.add(id))
	}

	/**
	 * Collect all downstream targets of a node
	 */
	function collectSources(node: SankeyNode) {
		traverse(node, 'sourceLinks', (id) => targetIds.value.add(id))
	}

	/**
	 * Determine if a link should be highlighted based on hover state
	 */
	const shouldHighlight = <T>(link: SankeyLink, options: HighlightOptions<T>): T => {
		const { trueValue, falseValue } = options
		const sourceId = getLinkSourceId(link)
		const targetId = getLinkTargetId(link)

		// Nothing is hovered, return false case
		if (!labelHoverId.value) return falseValue

		// Direct connection to hovered node
		if (sourceId === labelHoverId.value || targetId === labelHoverId.value) {
			return trueValue
		}

		// Only highlight downstream links if the hovered node isn't collapsed
		if (!collapsedNodes.value.has(labelHoverId.value)) {
			if (targetIds.value.has(sourceId)) {
				return trueValue
			}
		}

		// Highlight upstream links
		if (sourceIds.value.has(targetId)) {
			return trueValue
		}

		return falseValue
	}

	/**
	 * Reset collections and process a node to find connections
	 */
	const processHoveredNode = (node: SankeyNode | null) => {
		sourceIds.value.clear()
		targetIds.value.clear()

		if (node) {
			collectSources(node)
			collectTargets(node)
		}
	}

	return {
		sourceIds,
		targetIds,
		shouldHighlight,
		processHoveredNode,
	}
}
