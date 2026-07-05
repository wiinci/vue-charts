import { sankey, sankeyCenter, sankeyJustify, sankeyLeft, sankeyRight } from 'd3-sankey'
import { computed, type ComputedRef } from 'vue'
import {
	getSankeyNodeKey,
	normalizeSankeyData,
	type SankeyLayoutData,
	type SankeyLink,
	type SankeyLinkDatum,
	type SankeyNode,
	type SankeyNodeDatum,
	type SankeyProps,
	withSankeyNodeGeometry,
} from './sankeyModel'

export type { SankeyLink, SankeyProps, SankeyNode } from './sankeyModel'

export interface SankeyResult {
	chartHeight: ComputedRef<number>
	chartWidth: ComputedRef<number>
	nodes: ComputedRef<SankeyNode[]>
	links: ComputedRef<SankeyLink[]>
}

export function useNodesAndLinks(props: SankeyProps): SankeyResult {
	// Map nodeAlign to the corresponding sankey alignment function
	const alignMap = {
		justify: sankeyJustify,
		left: sankeyLeft,
		right: sankeyRight,
		center: sankeyCenter,
	} as const
	const align = computed(() => alignMap[props.nodeAlign])

	// Compute chart dimensions
	const chartHeight = computed(() => props.height - props.marginTop - props.marginBottom)
	const chartWidth = computed(() => props.width - props.marginLeft - props.marginRight)

	// Create sankey generator as a computed so it rebuilds when any config prop changes
	const sankeyGenerator = computed(() => {
		const gen = sankey<SankeyLayoutData, SankeyNodeDatum, SankeyLinkDatum>()
			.nodeAlign(align.value)
			.nodeId((node) => getSankeyNodeKey(node, props.nodeId))
			.nodePadding(props.nodePadding)
			.nodeWidth(props.nodeWidth)
			.extent([
				[props.marginLeft, props.marginTop],
				[chartWidth.value + props.marginLeft, chartHeight.value + props.marginTop],
			])
		if (props.sort) {
			gen.nodeSort(() => 0)
		}
		return gen
	})

	// Build node map from link data as a computed — synchronously reactive to props.data changes
	const processedData = computed(() => normalizeSankeyData(props.data, props.nodeId))

	// Generate the sankey diagram
	const sankeyData = computed(() => {
		const { nodes, links } = sankeyGenerator.value(processedData.value)

		return {
			nodes: nodes.map(withSankeyNodeGeometry),
			links,
		}
	})

	// Return the processed data
	return {
		chartHeight,
		chartWidth,
		nodes: computed(() => sankeyData.value.nodes),
		links: computed(() => sankeyData.value.links),
	}
}
