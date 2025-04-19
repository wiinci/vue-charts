<script setup lang="ts">
	import Chart from '@/components/common-ts/Chart.vue'
	import Voronoi from '@/components/common-ts/Voronoi.vue'
	import {useHierarchyCollapse} from '@/composables/useHierarchyCollapse'
	import {
		useNodesAndLinks,
		SankeyLink,
		SankeyNode,
		SankeyProps,
	} from '@/composables/useNodesAndLinks'
	import {computed, provide, ref, watchEffect} from 'vue'
	import Labels from './Labels.vue'
	import Links from './Links.vue'
	import Nodes from './Nodes.vue'

	const props = withDefaults(
		defineProps<{
			data: SankeyLink[]
			height?: number
			marginLeft?: number
			marginRight?: number
			marginBottom?: number
			marginTop?: number
			nodeAlign?: 'justify' | 'left' | 'right' | 'center'
			nodeId?: string
			nodePadding?: number
			nodeWidth?: number
			sort?: boolean
			width?: number
		}>(),
		{
			height: 480,
			marginLeft: 20,
			marginRight: 20,
			marginBottom: 20,
			marginTop: 20,
			nodeAlign: 'left',
			nodeId: 'id',
			nodePadding: 10,
			nodeWidth: 10,
			sort: false,
			width: 960,
		}
	)

	// Use the refactored composables
	const {chartWidth, nodes, links} = useNodesAndLinks(props as SankeyProps)

	// Reactive state for highlight functionality
	const labelDatum = ref<SankeyNode | {}>({})
	const labelId = ref<string>('')

	// Expose data to child components via provide/inject
	provide('labelDatum', labelDatum)
	provide('labelId', labelId)

	// Accessors for node positions
	const xAccessor = computed(() => (d: SankeyNode) => d.x0)
	const yAccessor = computed(() => (d: SankeyNode) => d.y0)

	// Use hierarchy-based collapse composable
	const {collapsed, visibleNodes, visibleLinks, toggle} = useHierarchyCollapse(
		nodes,
		links
	)

	/**
	 * Handle node click event - delegates to the toggle function
	 */
	const handleNodeClick = ({id}: {id: string}) => toggle(id)

	/**
	 * Update highlight state based on hovered node
	 */
	function highlightLinks({d}: {d: SankeyNode | any}) {
		labelId.value = d && typeof d === 'object' ? d.id : ''
		labelDatum.value = d && typeof d === 'object' ? d : {}
	}

	// Performance optimization - reset highlight when component unmounts
	watchEffect(onCleanup => {
		onCleanup(() => {
			labelId.value = ''
			labelDatum.value = {}
		})
	})
</script>

<template>
	<Chart
		:height="height"
		:marginLeft="0"
		:marginTop="0"
		:width="width"
	>
		<Links
			:data="visibleLinks"
			:collapsedNodes="collapsed"
		/>
		<Nodes
			:data="visibleNodes"
			:nodeId="nodeId"
			:xAccessor="xAccessor"
			:yAccessor="yAccessor"
			:collapsedNodes="collapsed"
			@click="toggle"
		/>
		<Labels
			:data="visibleNodes"
			:collapsedNodes="collapsed"
			:node-id="nodeId"
			:node-width="nodeWidth"
			:width="chartWidth"
		/>
		<Voronoi
			:classKey="'sankey'"
			:data="visibleNodes as any"
			:height="height"
			:width="width"
			:xAccessor="xAccessor as any"
			:yAccessor="yAccessor as any"
			@move-to="highlightLinks"
			@node-click="handleNodeClick"
		/>
	</Chart>
</template>
