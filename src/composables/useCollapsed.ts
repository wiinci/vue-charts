import {computed, ComputedRef, ref, Ref} from 'vue'
import {SankeyLink, SankeyNode} from './useNodesAndLinks'

export interface CollapsedResult {
	collapsedNodes: Ref<Set<string>>
	filteredLinks: ComputedRef<SankeyLink[]>
	filteredNodes: ComputedRef<SankeyNode[]>
	toggleCollapse: (nodeOrId: string | SankeyNode) => void
}

export function useCollapsed(
	nodes: ComputedRef<SankeyNode[]>,
	links: ComputedRef<SankeyLink[]>
): CollapsedResult {
	const collapsedNodes = ref<Set<string>>(new Set())

	/**
	 * Get a node by its ID from the nodes array
	 */
	function getNodeById(id: string): SankeyNode | undefined {
		return nodes.value.find(n => n.id === id)
	}

	/**
	 * Check if all source nodes of a given node are collapsed
	 */
	function allSourcesCollapsed(node: SankeyNode): boolean {
		if (!node.targetLinks || node.targetLinks.length === 0) {
			return false
		}
		return node.targetLinks.every(link => {
			const sourceId =
				typeof link.source === 'object'
					? link.source.id
					: (link.source as string)
			return collapsedNodes.value.has(sourceId)
		})
	}

	/**
	 * Expand all the downstream nodes from a particular node
	 */
	function expandDownstream(nodeId: string): void {
		const node = getNodeById(nodeId)
		if (!node || !node.sourceLinks) return

		node.sourceLinks.forEach(link => {
			const targetId =
				typeof link.target === 'object'
					? link.target.id
					: (link.target as string)
			const targetNode = getNodeById(targetId)

			if (!targetNode) return

			if (
				!allSourcesCollapsed(targetNode) &&
				collapsedNodes.value.has(targetId)
			) {
				collapsedNodes.value.delete(targetId)
				expandDownstream(targetId)
			} else if (!collapsedNodes.value.has(targetId)) {
				expandDownstream(targetId)
			}
		})
	}

	/**
	 * Collect all downstream node IDs from a particular node
	 */
	function collectDownstream(
		nodeId: string,
		visited = new Set<string>()
	): Set<string> {
		visited.add(nodeId)

		links.value
			.filter(link => {
				const sourceId =
					typeof link.source === 'object'
						? link.source.id
						: (link.source as string)
				return sourceId === nodeId
			})
			.forEach(link => {
				const targetId =
					typeof link.target === 'object'
						? link.target.id
						: (link.target as string)
				if (!visited.has(targetId)) collectDownstream(targetId, visited)
			})

		return visited
	}

	/**
	 * Find all source root nodes that lead to a given node
	 */
	function findNodeRootSources(
		nodeId: string,
		visited = new Set<string>()
	): Set<string> {
		visited.add(nodeId)
		const node = getNodeById(nodeId)

		if (!node) return new Set<string>()

		// If node has no incoming links, it's a root source
		if (!node.targetLinks || node.targetLinks.length === 0) {
			return new Set([nodeId])
		}

		// Otherwise, recursively find all root source nodes
		const roots = new Set<string>()
		node.targetLinks.forEach(link => {
			const sourceId =
				typeof link.source === 'object'
					? link.source.id
					: (link.source as string)

			if (!visited.has(sourceId)) {
				findNodeRootSources(sourceId, visited).forEach(r => roots.add(r))
			}
		})

		return roots
	}

	/**
	 * Toggle the collapsed state of a node
	 */
	function toggleCollapse(nodeOrId: string | SankeyNode): void {
		const id = typeof nodeOrId === 'object' ? nodeOrId.id : nodeOrId

		// If node is already collapsed, expand it
		if (collapsedNodes.value.has(id)) {
			collapsedNodes.value.delete(id)
			expandDownstream(id)
			return
		}

		// Otherwise, collapse the node
		collapsedNodes.value.add(id)
		const current = getNodeById(id)

		if (!current) return

		// Check if the node is a root source
		const isRootSource =
			!current.targetLinks || current.targetLinks.length === 0

		// Collect all downstream nodes
		const downstream = collectDownstream(id)
		downstream.delete(id) // Don't process the original node

		// Process each downstream node
		downstream.forEach(dId => {
			const downstreamNode = getNodeById(dId)
			if (!downstreamNode) return

			if (isRootSource) {
				// For root sources, check if all paths to this node are collapsed
				const roots = findNodeRootSources(dId)
				const allRootCollapsed = Array.from(roots).every(
					rootId => rootId === id || collapsedNodes.value.has(rootId)
				)

				if (allRootCollapsed) {
					collapsedNodes.value.add(dId)
				}
			} else if (downstreamNode.targetLinks) {
				// For non-root nodes, check if all sources are collapsed
				const allSrcCollapsed = downstreamNode.targetLinks.every(link => {
					const srcId =
						typeof link.source === 'object'
							? link.source.id
							: (link.source as string)
					return srcId === id || collapsedNodes.value.has(srcId)
				})

				if (allSrcCollapsed) {
					collapsedNodes.value.add(dId)
				}
			}
		})
	}

	/**
	 * Compute only those downstream nodes whose all source inputs are collapsed
	 */
	const collapsedDescendants = computed(() => {
		const desc = new Set<string>()
		// recursive traverse only when all sources to child are collapsed
		function dfs(id: string) {
			links.value.forEach(link => {
				const sourceId =
					typeof link.source === 'object' ? link.source.id : link.source
				const targetId =
					typeof link.target === 'object' ? link.target.id : link.target
				if (sourceId === id) {
					const node = getNodeById(targetId)
					if (node && allSourcesCollapsed(node) && !desc.has(targetId)) {
						desc.add(targetId)
						dfs(targetId)
					}
				}
			})
		}
		collapsedNodes.value.forEach(id => dfs(id))
		return desc
	})

	/**
	 * Filter links to hide outgoing connections from collapsed nodes and any link involving descendants
	 */
	const filteredLinks = computed((): SankeyLink[] =>
		links.value.filter(link => {
			const sourceId =
				typeof link.source === 'object'
					? link.source.id
					: (link.source as string)
			const targetId =
				typeof link.target === 'object'
					? link.target.id
					: (link.target as string)
			// Hide links outgoing from collapsed nodes
			if (collapsedNodes.value.has(sourceId)) return false
			// Hide links involving any collapsed descendants
			if (
				collapsedDescendants.value.has(sourceId) ||
				collapsedDescendants.value.has(targetId)
			)
				return false
			return true
		})
	)

	/**
	 * Filter nodes to exclude any descendants of collapsed nodes (but keep collapsed roots)
	 */
	const filteredNodes = computed((): SankeyNode[] =>
		nodes.value.filter(n => !collapsedDescendants.value.has(n.id))
	)

	return {
		collapsedNodes,
		filteredLinks,
		filteredNodes,
		toggleCollapse,
	}
}
