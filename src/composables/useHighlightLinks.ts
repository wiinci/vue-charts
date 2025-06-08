import {computed, Ref} from 'vue'

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
	// Collection arrays for sources and targets
	const sourceIds = computed(() => new Set<string>())
	const targetIds = computed(() => new Set<string>())

	/**
	 * Collect all upstream sources of a node
	 */
	function collectTargets(node: any, visited = new Set<string>()) {
		if (!node?.targetLinks?.length) return

		for (const link of node.targetLinks) {
			const sourceId = link.source.id
			if (!visited.has(sourceId)) {
				sourceIds.value.add(sourceId)
				visited.add(sourceId)
				// Only continue traversing if the source node is not collapsed
				if (!collapsedNodes.value.has(sourceId)) {
					collectTargets(link.source, visited)
				}
			}
		}
	}

	/**
	 * Collect all downstream targets of a node
	 */
	function collectSources(node: any, visited = new Set<string>()) {
		if (!node?.sourceLinks?.length) return

		for (const link of node.sourceLinks) {
			const targetId = link.target.id
			if (!visited.has(targetId)) {
				targetIds.value.add(targetId)
				visited.add(targetId)
				// Only continue traversing if the target node is not collapsed
				if (!collapsedNodes.value.has(targetId)) {
					collectSources(link.target, visited)
				}
			}
		}
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
			collectSources(node, new Set<string>())
			collectTargets(node, new Set<string>())
		}
	}

	return {
		sourceIds,
		targetIds,
		shouldHighlight,
		processHoveredNode,
	}
}
