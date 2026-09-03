import {sankeyLinkHorizontal} from 'd3-sankey'
import {computed, ref, type ComputedRef, type Ref} from 'vue'
import optimizeSvgPath from '@/utils/optimizeSvgPath'
import {type SankeyLink, type SankeyNodeDatum, getSankeyNodeKey} from './sankeyModel'
import {type SankeyLink as SankeyLinkLayout, type SankeyNode, type SankeyProps, useNodesAndLinks} from './useNodesAndLinks'
import {
	allIncomingSourcesMatch,
	createNodeLookup,
	getLinkSourceId,
	getLinkTargetId,
	getLinkTargetNode,
} from './sankeyTraversal'
import {useHighlightLinks} from './useHighlightLinks'

export interface SceneLink {
	/** `${sourceId}-${targetId}` — the same key Links.vue joins on */
	key: string
	/** SVG path data from sankeyLinkHorizontal(); the executor wraps it in a Path2D */
	path: string
	/** Exactly useHighlightLinks.shouldHighlight — the SVG's rule */
	emphasized: boolean
}

export interface SceneLabel {
	id: string
	text: string
	/** Layout units, 0–width: the node's anchor point */
	x: number
	/** Layout units, 0–height: node.y + node.height / 2 */
	y: number
	/** x / width — overlay mode positions with percentages of the frame */
	fx: number
	/** y / height — overlay mode positions with percentages of the frame */
	fy: number
	/** Labels.vue rule: the anchor flips at the chart-width midline */
	anchor: 'start' | 'end'
	/**
	 * Only the states the SVG toggles today. The SVG's labels change nothing
	 * visually on hover — the classes exist as state hooks, styled identically.
	 */
	state: 'rest' | 'active' | 'muted'
}

export interface SankeyCanvasScene {
	width: number
	height: number
	hoveredId: string
	/** Rest links first, emphasized last, so emphasis paints on top as raised SVG paths do */
	links: SceneLink[]
	labels: SceneLabel[]
}

export interface SankeyCanvasSceneOptions {
	/**
	 * Collapsed node ids; PR3 wires the SVG's `useCollapsed` state here. Treated
	 * as a post-layout scene filter — hidden links/labels are omitted and every
	 * other item keeps its exact geometry — never a layout recompute, matching
	 * the SVG's collapse behaviour.
	 */
	collapsedNodes?: Ref<Set<string>>
}

export interface SankeyCanvasSceneResult {
	scene: ComputedRef<SankeyCanvasScene>
	setHovered: (id: string) => void
	clearHovered: () => void
}

/**
 * Collect the descendants hidden by the collapsed set: a node is hidden when
 * all of its incoming sources are collapsed or already hidden. Mirrors
 * useCollapsed's collapsedDescendants so the canvas route filters scenes with
 * the SVG's own rule.
 */
function collectHiddenNodeIds(
	collapsedNodes: ReadonlySet<string>,
	nodeLookup: ReadonlyMap<string, SankeyNode>,
): Set<string> {
	const hidden = new Set<string>()
	if (collapsedNodes.size === 0) return hidden

	const isHidden = (node: SankeyNode): boolean =>
		allIncomingSourcesMatch(node, nodeLookup, (sourceNode) =>
			collapsedNodes.has(sourceNode.id) || hidden.has(sourceNode.id),
		)

	function dfs(node: SankeyNode) {
		node.sourceLinks?.forEach((link) => {
			const targetNode = getLinkTargetNode(link, nodeLookup)
			if (!targetNode || hidden.has(targetNode.id)) return
			if (isHidden(targetNode)) {
				hidden.add(targetNode.id)
				dfs(targetNode)
			}
		})
	}

	collapsedNodes.forEach((id) => {
		const root = nodeLookup.get(id)
		if (root) dfs(root)
	})

	return hidden
}

export function useSankeyCanvasScene(
	props: SankeyProps,
	options: SankeyCanvasSceneOptions = {},
): SankeyCanvasSceneResult {
	const collapsedNodes = options.collapsedNodes ?? ref(new Set<string>())
	const hoveredId = ref('')

	const {nodes, links} = useNodesAndLinks(props)
	const {sourceIds, targetIds, shouldHighlight, processHoveredNode} = useHighlightLinks(hoveredId, collapsedNodes)

	const pathOf = sankeyLinkHorizontal<SankeyNodeDatum, SankeyLink>()
	const lookup = computed(() => createNodeLookup(nodes.value))

	function setHovered(id: string) {
		hoveredId.value = id
		processHoveredNode(lookup.value.get(id) ?? null)
	}

	function clearHovered() {
		hoveredId.value = ''
		processHoveredNode(null)
	}

	// Post-layout filter, exactly like the SVG's collapse: drop links out of
	// collapsed nodes or touching hidden descendants, drop hidden node labels.
	// With an empty collapsed set the layout arrays pass through untouched.
	const hiddenNodeIds = computed(() => collectHiddenNodeIds(collapsedNodes.value, lookup.value))

	const visibleLinks = computed(() => {
		if (collapsedNodes.value.size === 0) return links.value
		return links.value.filter((link) => {
			const sourceId = getLinkSourceId(link)
			const targetId = getLinkTargetId(link)
			if (collapsedNodes.value.has(sourceId)) return false
			if (hiddenNodeIds.value.has(sourceId) || hiddenNodeIds.value.has(targetId)) return false
			return true
		})
	})

	const visibleNodes = computed(() => {
		if (collapsedNodes.value.size === 0) return nodes.value
		return nodes.value.filter((node) => !hiddenNodeIds.value.has(node.id))
	})

	const scene = computed<SankeyCanvasScene>(() => {
		const isHovering = hoveredId.value !== ''
		const activeIds = new Set([hoveredId.value, ...sourceIds.value, ...targetIds.value])
		// Labels.vue receives the chart width (props minus margins), so the
		// SVG's anchor midline is chartWidth / 2, not width / 2.
		const chartMidline = (props.width - props.marginLeft - props.marginRight) / 2

		return {
			width: props.width,
			height: props.height,
			hoveredId: hoveredId.value,
			links: visibleLinks.value
				.map((link: SankeyLinkLayout) => ({
					key: `${getLinkSourceId(link)}-${getLinkTargetId(link)}`,
					// Same 2-decimal rounding the SVG renders (Links.vue)
					path: optimizeSvgPath(pathOf(link) ?? ''),
					emphasized: shouldHighlight(link, {trueValue: true, falseValue: false}),
				}))
				// Stable sort: rest links keep layout order, emphasized go last,
				// as raising SVG paths to the top does
				.sort((a, b) => Number(a.emphasized) - Number(b.emphasized)),
			labels: visibleNodes.value.map((node) => {
				const key = getSankeyNodeKey(node, props.nodeId)
				const y = node.y + node.height / 2
				return {
					id: key,
					text: key,
					x: node.x,
					y,
					fx: node.x / props.width,
					fy: y / props.height,
					anchor: node.x < chartMidline ? 'start' : 'end',
					state: !isHovering ? 'rest' : activeIds.has(key) ? 'active' : 'muted',
				}
			}),
		}
	})

	return {scene, setHovered, clearHovered}
}
