<script setup>
	import Chart from '@/components/common-ts/Chart.vue'
	import Voronoi from '@/components/common-ts/Voronoi.vue'
	import useNodesAndLinks from '@/hooks/useNodesAndLinks'
	import {computed, provide, ref} from 'vue'
	import Labels from './Labels.vue'
	import Links from './Links.vue'
	import Nodes from './Nodes.vue'

	const props = defineProps({
		data: {
			required: true,
			type: Array,
		},
		height: {
			default: 480,
			type: Number,
		},
		marginLeft: {
			default: 20,
			type: Number,
		},
		marginRight: {
			default: 20,
			type: Number,
		},
		marginBottom: {
			default: 20,
			type: Number,
		},
		marginTop: {
			default: 20,
			type: Number,
		},
		nodeAlign: {
			default: 'left',
			type: String,
			validator: value =>
				['left', 'right', 'center', 'justify'].includes(value),
		},
		nodeId: {
			default: 'id',
			type: String,
		},
		nodePadding: {
			default: 10,
			type: Number,
		},
		nodeWidth: {
			default: 10,
			type: Number,
		},
		sort: {
			default: false,
			type: Boolean,
		},
		width: {
			default: 960,
			type: Number,
		},
	})

	const {chartWidth, links, nodes} = useNodesAndLinks(props)

	const labelDatum = ref({})
	const labelId = ref('')

	// Memoize accessors
	const xAccessor = computed(() => d => d.x0)
	const yAccessor = computed(() => d => d.y0)

	// Provide context to child components
	provide('labelDatum', labelDatum)
	provide('labelId', labelId)

	const highlightLinks = ({d}) => {
		labelId.value = typeof d === 'object' ? d.id : ''
		labelDatum.value = typeof d === 'object' ? d : {}
	}

	// Add a reactive state to track collapsed nodes
	const collapsedNodes = ref(new Set())

	// Function to recursively collect all downstream nodes and links from a given node
	const collectDownstreamNodes = (nodeId, visited = new Set()) => {
		// Add the current node to the visited set
		visited.add(nodeId)

		// Find all links where the current node is the source
		links
			.filter(link => {
				// Compare as strings to handle all node ID formats
				const sourceId = typeof link.source === 'object' ? link.source.id : link.source
				return sourceId === nodeId
			})
			.forEach(link => {
				// Get the target node ID
				const targetId = typeof link.target === 'object' ? link.target.id : link.target
				// Add the target node to the visited set if not already visited
				if (!visited.has(targetId)) {
					visited.add(targetId)
					// Recursively collect all downstream nodes of this target
					collectDownstreamNodes(targetId, visited)
				}
			})

		return visited
	}

	// Additional debug function to validate the collapse/expand recursion
	const debugTraversal = nodeId => {
		console.log(`Traversing from node: ${nodeId}`)
		const downstream = collectDownstreamNodes(nodeId)
		console.log(
			`Found ${downstream.size} downstream nodes:`,
			Array.from(downstream)
		)
		return downstream
	}

	// Function to toggle collapse/expand on node click with improved handling
	const toggleCollapse = node => {
		// Use the node's id for identification
		const nodeId = node.id || node

		// Collect all downstream nodes
		const downstreamNodes = collectDownstreamNodes(nodeId)

		if (collapsedNodes.value.has(nodeId)) {
			// Expand: Remove the current node and all its downstream nodes from the collapsed set
			downstreamNodes.forEach(id => collapsedNodes.value.delete(id))
		} else {
			// Collapse: Add the current node and all its downstream nodes to the collapsed set
			downstreamNodes.forEach(id => collapsedNodes.value.add(id))
		}
	}

	// Update the nodes and links based on collapsed state
	const filteredLinks = computed(() => {
		return links.filter(link => {
			// Hide links only if the source node is collapsed
			return !collapsedNodes.value.has(link.source.id)
		})
	})

	const filteredNodes = computed(() => {
		const visibleNodes = new Set()

		// Add all nodes that are part of visible links
		filteredLinks.value.forEach(link => {
			visibleNodes.add(link.source.id)
			visibleNodes.add(link.target.id)
		})

		// Add collapsed nodes to keep them visible
		collapsedNodes.value.forEach(nodeId => {
			visibleNodes.add(nodeId)
		})

		return nodes.filter(node => visibleNodes.has(node.id))
	})

	// Listen for the node-click event from Voronoi
	const handleNodeClick = ({id}) => {
		toggleCollapse({id})
	}
</script>

<template>
	<Chart
		:height="height"
		:marginLeft="0"
		:marginTop="0"
		:width="width"
	>
		<Links
			:data="filteredLinks"
			:collapsedNodes="collapsedNodes"
		/>
		<Nodes
			:data="filteredNodes"
			:nodeId="nodeId"
			:xAccessor="xAccessor"
			:yAccessor="yAccessor"
			:collapsedNodes="collapsedNodes"
			@click="toggleCollapse"
		/>
		<Labels
			:data="filteredNodes"
			:collapsedNodes="collapsedNodes"
			:node-id="nodeId"
			:node-width="nodeWidth"
			:width="chartWidth"
		/>
		<Voronoi
			:classKey="'sankey'"
			:data="filteredNodes"
			:height="height"
			:width="width"
			:xAccessor="xAccessor"
			:yAccessor="yAccessor"
			@move-to="highlightLinks"
			@node-click="handleNodeClick"
		/>
	</Chart>
</template>
