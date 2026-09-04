import {sankeyLinkHorizontal} from 'd3-sankey'
import {linkHorizontal} from 'd3-shape'
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
import {useCollapsed} from './useCollapsed'

export interface SceneLink {
	/** `${sourceId}-${targetId}` — the same key Links.vue joins on */
	key: string
	/** SVG path data from sankeyLinkHorizontal(); the executor wraps it in a Path2D */
	path: string
	/** Flat line at the source node — the entrance animation's first frame (Links.vue's initialLinkAccessor) */
	initialPath: string
	/** The source node's layout depth — drives the SVG's animation delay curve (Links.vue's getLinkDepth) */
	depth: number
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
	/** The node's layout depth — drives the SVG's animation delay curve (Labels.vue) */
	depth: number
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
	 * Overrides the planner's own collapse state (the SVG's `useCollapsed`,
	 * instantiated by default). Always treated as a post-layout scene filter —
	 * hidden links/labels are omitted and every other item keeps its exact
	 * geometry — never a layout recompute, matching the SVG's collapse.
	 */
	collapsedNodes?: Ref<Set<string>>
}

export interface SankeyCanvasSceneResult {
	scene: ComputedRef<SankeyCanvasScene>
	setHovered: (id: string) => void
	clearHovered: () => void
	/**
	 * The SVG's own `useCollapsed().toggleCollapse` when the planner owns the
	 * collapse state (no `collapsedNodes` option). Null when the caller supplied
	 * their own set — a toggle mutating state the planner doesn't filter by
	 * would silently do nothing.
	 */
	toggleCollapse: ((nodeOrId: string | SankeyNode) => void) | null
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
	const hoveredId = ref('')

	const {nodes, links} = useNodesAndLinks(props)

	// Collapse state is the SVG's own useCollapsed composable, driven by
	// toggleCollapse and filtered post-layout below. A caller-supplied set
	// (tests, alternate wirings) replaces it — those callers filter scenes
	// without toggling.
	const collapse = options.collapsedNodes
		? {collapsedNodes: options.collapsedNodes, toggleCollapse: null}
		: useCollapsed(nodes, links)
	const collapsedNodes = collapse.collapsedNodes

	const {sourceIds, targetIds, shouldHighlight, processHoveredNode} = useHighlightLinks(hoveredId, collapsedNodes)

	const pathOf = sankeyLinkHorizontal<SankeyNodeDatum, SankeyLink>()
	// Links.vue:27-36 — linkHorizontal with both generator endpoints at the
	// source node's [x0, y0]: the flat line every entrance sweep starts from
	const initialGenerator = linkHorizontal<SankeyLinkLayout, [number, number]>()
		.source((link) => {
			const source = link.source as SankeyNode
			return [source.x0 ?? 0, source.y0 ?? 0]
		})
		.target((link) => {
			const source = link.source as SankeyNode
			return [source.x0 ?? 0, source.y0 ?? 0]
		})
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

	// Geometry is independent of hover, so it is memoized separately: hovering
	// then only re-derives `emphasized`/`state` instead of regenerating and
	// re-rounding 41 path strings on every pointer move.
	const linkGeometry = computed(() =>
		visibleLinks.value.map((link: SankeyLinkLayout) => ({
			link,
			key: `${getLinkSourceId(link)}-${getLinkTargetId(link)}`,
			// Same 2-decimal rounding the SVG renders (Links.vue)
			path: optimizeSvgPath(pathOf(link) ?? ''),
			initialPath: optimizeSvgPath(initialGenerator(link) ?? ''),
			depth: (link.source as SankeyNode).depth || 0,
		})),
	)

	const labelGeometry = computed(() => {
		// Labels.vue receives the chart width (props minus margins), so the
		// SVG's anchor midline is chartWidth / 2, not width / 2.
		const chartMidline = (props.width - props.marginLeft - props.marginRight) / 2

		return visibleNodes.value.map((node) => {
			const key = getSankeyNodeKey(node, props.nodeId)
			const y = node.y + node.height / 2
			return {
				id: key,
				text: key,
				x: node.x,
				y,
				fx: node.x / props.width,
				fy: y / props.height,
				anchor: (node.x < chartMidline ? 'start' : 'end') as 'start' | 'end',
				// Labels.vue's (d.depth || 0)
				depth: node.depth || 0,
			}
		})
	})

	const scene = computed<SankeyCanvasScene>(() => {
		const isHovering = hoveredId.value !== ''
		const activeIds = new Set([hoveredId.value, ...sourceIds.value, ...targetIds.value])

		return {
			width: props.width,
			height: props.height,
			hoveredId: hoveredId.value,
			links: linkGeometry.value
				.map(({link, ...geometry}) => ({
					...geometry,
					emphasized: shouldHighlight(link, {trueValue: true, falseValue: false}),
				}))
				// Stable sort: rest links keep layout order, emphasized go last,
				// as raising SVG paths to the top does
				.sort((a, b) => Number(a.emphasized) - Number(b.emphasized)),
			labels: labelGeometry.value.map((geometry) => ({
				...geometry,
				state: !isHovering ? 'rest' : activeIds.has(geometry.id) ? 'active' : 'muted',
			})),
		}
	})

	return {scene, setHovered, clearHovered, toggleCollapse: collapse.toggleCollapse}
}
