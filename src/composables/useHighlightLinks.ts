import {ref, Ref} from 'vue'

interface LinkData {
	source: {
		id: string
		[key: string]: any
	}
	target: {
		id: string
		[key: string]: any
	}
	[key: string]: any
}

interface HighlightOptions {
	trueValue: string | number | boolean
	falseValue: string | number | boolean
}

export function useHighlightLinks(
	labelHoverId: Ref<string>,
	collapsedNodes: Ref<Set<string>>
) {
	// Collections for sources and targets as refs
	const sourceIds = ref(new Set<string>())
	const targetIds = ref(new Set<string>())

	// Generic traversal helper: traverses links on a node using the provided linkKey
	function traverse(
		node: any,
		linkKey: 'targetLinks' | 'sourceLinks',
		addId: (id: string) => void,
		visited = new Set<string>()
	) {
		if (!node?.[linkKey]?.length) return
		for (const link of node[linkKey]) {
			const id = link[linkKey === 'targetLinks' ? 'source' : 'target'].id
			if (!visited.has(id)) {
				addId(id)
				visited.add(id)
				if (!collapsedNodes.value.has(id)) {
					traverse(
						link[linkKey === 'targetLinks' ? 'source' : 'target'],
						linkKey,
						addId,
						visited
					)
				}
			}
		}
	}

	/**
	 * Collect all upstream sources of a node
	 */
	function collectTargets(node: any) {
		traverse(node, 'targetLinks', id => sourceIds.value.add(id))
	}

	/**
	 * Collect all downstream targets of a node
	 */
	function collectSources(node: any) {
		traverse(node, 'sourceLinks', id => targetIds.value.add(id))
	}

	/**
	 * Determine if a link should be highlighted based on hover state
	 */
	const shouldHighlight = (link: LinkData, options: HighlightOptions) => {
		const {trueValue, falseValue} = options

		// Nothing is hovered, return false case
		if (!labelHoverId.value) return falseValue

		// Direct connection to hovered node
		if (
			link.source.id === labelHoverId.value ||
			link.target.id === labelHoverId.value
		) {
			return trueValue
		}

		// Only highlight downstream links if the hovered node isn't collapsed
		if (!collapsedNodes.value.has(labelHoverId.value)) {
			if (targetIds.value.has(link.source.id)) {
				return trueValue
			}
		}

		// Highlight upstream links
		if (sourceIds.value.has(link.target.id)) {
			return trueValue
		}

		return falseValue
	}

	/**
	 * Reset collections and process a node to find connections
	 */
	const processHoveredNode = (node: any | null) => {
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
