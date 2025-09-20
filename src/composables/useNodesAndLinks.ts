import {
	sankey,
	sankeyCenter,
	sankeyJustify,
	sankeyLeft,
	sankeyRight,
} from 'd3-sankey'
import {computed, ComputedRef, UnwrapRef, ref, watchEffect} from 'vue'

export interface SankeyNode {
	id: string
	x0: number
	x1: number
	y0: number
	y1: number
	value: number
	index?: number
	depth?: number
	height?: number
	layer?: number
	sourceLinks?: SankeyLink[]
	targetLinks?: SankeyLink[]
	[key: string]: any
}

export interface SankeyLink {
	source: SankeyNode | string
	target: SankeyNode | string
	value: number
	width?: number
	y0?: number
	y1?: number
	[key: string]: any
}

export interface SankeyProps {
	data: SankeyLink[]
	height: number
	marginLeft: number
	marginTop: number
	marginBottom: number
	marginRight: number
	nodeAlign: 'justify' | 'left' | 'right' | 'center'
	nodeId: string
	nodePadding: number
	nodeWidth: number
	sort: boolean
	width: number
}

interface SankeyData {
	nodes: SankeyNode[]
	links: SankeyLink[]
}

export interface SankeyResult {
	chartHeight: ComputedRef<number>
	chartWidth: ComputedRef<number>
	nodes: SankeyNode[]
	links: SankeyLink[]
}

export function useNodesAndLinks(props: UnwrapRef<SankeyProps>): SankeyResult {
	// Map nodeAlign to the corresponding sankey alignment function
	const alignMap = {
		justify: sankeyJustify,
		left: sankeyLeft,
		right: sankeyRight,
		center: sankeyCenter,
	} as const
	const align = computed(() => alignMap[props.nodeAlign])

	// Compute chart dimensions
	const chartHeight = computed(
		() => props.height - props.marginTop - props.marginBottom
	)
	const chartWidth = computed(
		() => props.width - props.marginLeft - props.marginRight
	)

	// Create sankey generator ref with configuration (no side-effects in computed)
	const sankeyGenerator = ref(
		sankey()
			.nodeAlign(align.value)
			.nodeId(d => (d as any)[props.nodeId])
			.nodePadding(props.nodePadding)
			.nodeWidth(props.nodeWidth)
			.extent([
				[props.marginLeft, props.marginTop],
				[
					chartWidth.value + props.marginLeft,
					chartHeight.value + props.marginTop,
				],
			])
	)
	watchEffect(() => {
		const gen = sankey()
			.nodeAlign(align.value)
			.nodeId(d => (d as any)[props.nodeId])
			.nodePadding(props.nodePadding)
			.nodeWidth(props.nodeWidth)
			.extent([
				[props.marginLeft, props.marginTop],
				[
					chartWidth.value + props.marginLeft,
					chartHeight.value + props.marginTop,
				],
			])
		if (props.sort) {
			gen.nodeSort(() => 0)
		}
		sankeyGenerator.value = gen
	})

	// Process data to ensure all nodes have a value (moved from computed to ref+watchEffect)
	const processedData = ref<SankeyData>({nodes: [], links: []})
	watchEffect(() => {
		const nodeById = new Map<string, SankeyNode>()
		const links = props.data.map(link => ({...link, value: link.value || 1}))
		for (const link of links) {
			const sourceId =
				typeof link.source === 'string' ? link.source : link.source.id
			const targetId =
				typeof link.target === 'string' ? link.target : link.target.id
			if (!nodeById.has(sourceId)) {
				nodeById.set(sourceId, {
					[props.nodeId]: sourceId,
					id: sourceId,
					x0: 0,
					x1: 0,
					y0: 0,
					y1: 0,
					value: 0,
				} as SankeyNode)
			}
			if (!nodeById.has(targetId)) {
				nodeById.set(targetId, {
					[props.nodeId]: targetId,
					id: targetId,
					x0: 0,
					x1: 0,
					y0: 0,
					y1: 0,
					value: 0,
				} as SankeyNode)
			}
		}
		processedData.value = {
			nodes: Array.from(nodeById.values()),
			links,
		}
	})

	// Generate the sankey diagram
	const sankeyData = computed(() =>
		sankeyGenerator.value(processedData.value as SankeyData)
	)

	// Return the processed data
	return {
		chartHeight,
		chartWidth,
		nodes: sankeyData.value.nodes,
		links: sankeyData.value.links,
	} as SankeyResult
}
