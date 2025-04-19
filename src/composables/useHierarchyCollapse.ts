// Wrap the existing useCollapsed to drive collapse/expand logic
import {computed} from 'vue'
import {useCollapsed} from './useCollapsed'
import type {SankeyNode, SankeyLink} from './useNodesAndLinks'

/**
 * Provides collapse/expand based on Sankey graph semantics
 */
export function useHierarchyCollapse(nodes: SankeyNode[], links: SankeyLink[]) {
	// Wrap inputs in computed refs for useCollapsed
	const nodesRef = computed(() => nodes)
	const linksRef = computed(() => links)

	const {collapsedNodes, filteredNodes, filteredLinks, toggleCollapse} =
		useCollapsed(nodesRef, linksRef)

	return {
		collapsed: collapsedNodes,
		visibleNodes: filteredNodes,
		visibleLinks: filteredLinks,
		toggle: toggleCollapse,
	}
}
