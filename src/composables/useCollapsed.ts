import {computed, ComputedRef, ref, Ref, watchEffect} from 'vue'
import {SankeyLink, SankeyNode} from './useNodesAndLinks'
import {
	allIncomingSourcesMatch,
	collectDownstreamNodeIds,
	collectRootSourceIds,
	createNodeLookup,
	getLinkSourceId,
	getLinkTargetId,
	getLinkTargetNode,
} from './sankeyTraversal'

export interface CollapsedResult {
	collapsedNodes: Ref<Set<string>>
	filteredLinks: ComputedRef<SankeyLink[]>
	filteredNodes: ComputedRef<SankeyNode[]>
	toggleCollapse: (nodeOrId: string | SankeyNode) => void
}

export function useCollapsed(
	nodes: ComputedRef<SankeyNode[]>,
	links: ComputedRef<SankeyLink[]>,
): CollapsedResult {
	const collapsedNodes = ref<Set<string>>(new Set())
	const nodeLookup = computed(() => createNodeLookup(nodes.value))

	/**
	 * Get a node by its ID from the nodes array
	 */
	function getNodeById(id: string): SankeyNode | undefined {
		return nodeLookup.value.get(id)
	}

	/**
	 * Check if all source nodes of a given node are collapsed
	 */
	function allSourcesCollapsed(node: SankeyNode): boolean {
		return allIncomingSourcesMatch(node, nodeLookup.value, (sourceNode) =>
			collapsedNodes.value.has(sourceNode.id),
		)
	}

	/**
	 * Expand all the downstream nodes from a particular node
	 */
	function expandDownstream(nodeId: string): void {
		const node = getNodeById(nodeId)
		if (!node || !node.sourceLinks) return

		node.sourceLinks.forEach((link) => {
			const targetNode = getLinkTargetNode(link, nodeLookup.value)

			if (!targetNode) return
			const targetId = targetNode.id

			if (!allSourcesCollapsed(targetNode) && collapsedNodes.value.has(targetId)) {
				collapsedNodes.value.delete(targetId)
				expandDownstream(targetId)
				return
			}
			if (!collapsedNodes.value.has(targetId)) {
				expandDownstream(targetId)
			}
		})
	}

	/**
	 * Collect all downstream node IDs from a particular node
	 */
	function collectDownstream(
		nodeId: string,
		visited = new Set<string>(),
		sourceDepth?: number,
	): Set<string> {
		return collectDownstreamNodeIds(nodeId, nodeLookup.value, visited, sourceDepth)
	}

	/**
	 * Find all source root nodes that lead to a given node
	 */
	function findNodeRootSources(nodeId: string, visited = new Set<string>()): Set<string> {
		return collectRootSourceIds(nodeId, nodeLookup.value, visited)
	}

	/**
	 * Toggle the collapsed state of a node
	 */
	// Helper: decide if a downstream node should be collapsed when a parent collapses
	function shouldCollapseDescendant(parentId: string, dId: string, isRootSource: boolean): boolean {
		const downstreamNode = getNodeById(dId)
		if (!downstreamNode) return false

		const incomingLinks = downstreamNode.targetLinks ?? []
		if (incomingLinks.length === 0) {
			return downstreamNode.height === 0
		}

		const immediateSourcesCollapsed = incomingLinks.every((link) => {
			const srcId = getLinkSourceId(link)
			return srcId === parentId || collapsedNodes.value.has(srcId)
		})

		if (downstreamNode.height === 0) {
			return immediateSourcesCollapsed
		}

		if (isRootSource) {
			const roots = findNodeRootSources(dId)
			return Array.from(roots).every(
				(rootId) => rootId === parentId || collapsedNodes.value.has(rootId),
			)
		}
		return immediateSourcesCollapsed
	}

	function toggleCollapse(nodeOrId: string | SankeyNode): void {
		const id = typeof nodeOrId === 'object' ? nodeOrId.id : nodeOrId

		// If node is already collapsed, expand it
		if (collapsedNodes.value.has(id)) {
			collapsedNodes.value.delete(id)
			expandDownstream(id)
			return
		}

		// Otherwise, collapse the node and evaluate descendants
		collapsedNodes.value.add(id)
		const current = getNodeById(id)
		if (!current) return
		const isRootSource = !current.targetLinks || current.targetLinks.length === 0
		const downstream = collectDownstream(id)
		downstream.delete(id)

		// Sort by depth to ensure parents are processed before children
		const sortedDownstream = Array.from(downstream).sort((aId, bId) => {
			const a = getNodeById(aId)
			const b = getNodeById(bId)
			return (a?.depth ?? 0) - (b?.depth ?? 0)
		})

		sortedDownstream.forEach((dId) => {
			if (shouldCollapseDescendant(id, dId, isRootSource)) {
				collapsedNodes.value.add(dId)
			}
		})
	}

	/**
	 * Track collapsed descendants of collapsed nodes via watchEffect
	 */
	const collapsedDescendants = ref<Set<string>>(new Set())

	watchEffect(() => {
		const desc = new Set<string>()
		const collapsed = collapsedNodes.value
		if (collapsed.size === 0) {
			collapsedDescendants.value = desc
			return
		}

		function dfs(node: SankeyNode) {
			if (!node.sourceLinks) return
			node.sourceLinks.forEach((link) => {
				const targetNode = getLinkTargetNode(link, nodeLookup.value)
				if (!targetNode) return

				// Prevent infinite recursion if cyclic (though Sankey shouldn't be)
				if (desc.has(targetNode.id)) return

				if (allSourcesCollapsed(targetNode)) {
					desc.add(targetNode.id)
					dfs(targetNode)
				}
			})
		}

		collapsed.forEach((id) => {
			const root = getNodeById(id)
			if (!root) return
			dfs(root)
		})

		collapsedDescendants.value = desc
	})

	/**
	 * Filter links to hide outgoing connections from collapsed nodes and any link involving descendants
	 */
	const filteredLinks = computed((): SankeyLink[] =>
		links.value.filter((link) => {
			const sourceId = getLinkSourceId(link)
			const targetId = getLinkTargetId(link)
			// Hide links outgoing from collapsed nodes
			if (collapsedNodes.value.has(sourceId)) return false
			// Hide links involving any collapsed descendants
			if (collapsedDescendants.value.has(sourceId) || collapsedDescendants.value.has(targetId))
				return false
			return true
		}),
	)

	/**
	 * Filter nodes to exclude any descendants of collapsed nodes (but keep collapsed roots)
	 */
	const filteredNodes = computed((): SankeyNode[] =>
		nodes.value.filter((n) => !collapsedDescendants.value.has(n.id)),
	)

	return {
		collapsedNodes,
		filteredLinks,
		filteredNodes,
		toggleCollapse,
	}
}
