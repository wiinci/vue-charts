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
				const sourceId =
					typeof link.source === 'object' ? link.source.id : link.source
				return sourceId === nodeId
			})
			.forEach(link => {
				// Get the target node ID
				const targetId =
					typeof link.target === 'object' ? link.target.id : link.target
				// Add the target node to the visited set if not already visited
				if (!visited.has(targetId)) {
					visited.add(targetId)
					// Recursively collect all downstream nodes of this target
					collectDownstreamNodes(targetId, visited)
				}
			})

		return visited
	}

	// Find all root sources in the graph (nodes with no incoming links)
	const findRootSources = () => {
		const rootSources = new Set()
		nodes.forEach(node => {
			if (!node.targetLinks || node.targetLinks.length === 0) {
				rootSources.add(node.id)
			}
		})
		return rootSources
	}

	// Find the root source(s) of a specific node by tracing back through its incoming links
	const findNodeRootSources = (nodeId, visited = new Set()) => {
		visited.add(nodeId)
		const node = nodes.find(n => n.id === nodeId)
		if (!node) return new Set()

		// If this is a root node (no incoming links), return itself
		if (!node.targetLinks || node.targetLinks.length === 0) {
			return new Set([nodeId])
		}

		// Otherwise, recursively find the root sources of all its incoming links
		const rootSources = new Set()
		node.targetLinks.forEach(link => {
			const sourceId =
				typeof link.source === 'object' ? link.source.id : link.source
			if (!visited.has(sourceId)) {
				const sourceRoots = findNodeRootSources(sourceId, visited)
				sourceRoots.forEach(root => rootSources.add(root))
			}
		})

		return rootSources
	}

	// Function to toggle collapse/expand on node click with improved handling for multiple sources
	const toggleCollapse = node => {
		const nodeId = node.id || node

		if (collapsedNodes.value.has(nodeId)) {
			collapsedNodes.value.delete(nodeId)

			const expandDownstream = nId => {
				const n = nodes.find(nn => nn.id === nId)
				if (!n || !n.sourceLinks) return
				n.sourceLinks.forEach(link => {
					const targetId =
						typeof link.target === 'object' ? link.target.id : link.target
					const targetNode = nodes.find(nn => nn.id === targetId)
					if (!targetNode) return
					const allSourcesCollapsed =
						targetNode.targetLinks &&
						targetNode.targetLinks.every(l =>
							collapsedNodes.value.has(
								typeof l.source === 'object' ? l.source.id : l.source
							)
						)
					if (!allSourcesCollapsed && collapsedNodes.value.has(targetId)) {
						collapsedNodes.value.delete(targetId)
						expandDownstream(targetId)
					} else if (!collapsedNodes.value.has(targetId)) {
						expandDownstream(targetId)
					}
				})
			}
			expandDownstream(nodeId)
		} else {
			// COLLAPSE: Add the node to the collapsed set
			collapsedNodes.value.add(nodeId)

			// Find the node object to check if it's a root source
			const currentNode = nodes.find(n => n.id === nodeId)
			const isRootSource =
				!currentNode?.targetLinks || currentNode.targetLinks.length === 0

			// Get all downstream nodes
			const downstreamNodes = new Set(collectDownstreamNodes(nodeId))
			downstreamNodes.delete(nodeId) // Remove the original node from downstream set

			// Process each downstream node
			downstreamNodes.forEach(id => {
				const node = nodes.find(n => n.id === id)
				if (!node) return

				if (isRootSource) {
					// For root source nodes, we need to check if the downstream node
					// is influenced by any other non-collapsed root sources
					const allRootSources = findNodeRootSources(id)

					// Check if all root sources for this node are now collapsed
					const allRootSourcesCollapsed = Array.from(allRootSources).every(
						rootSourceId =>
							rootSourceId === nodeId || collapsedNodes.value.has(rootSourceId)
					)

					// Only collapse if all root sources are now collapsed
					if (allRootSourcesCollapsed) {
						collapsedNodes.value.add(id)
					}
				} else if (node.targetLinks) {
					// For non-root nodes, only collapse if ALL sources are collapsed
					const allSourcesCollapsed = node.targetLinks.every(link => {
						const sourceId =
							typeof link.source === 'object' ? link.source.id : link.source
						// A source is considered "collapsed" if:
						// 1. It's the node we're currently collapsing, or
						// 2. It's already in the collapsed nodes set
						return sourceId === nodeId || collapsedNodes.value.has(sourceId)
					})

					// Only collapse this node if ALL of its sources are collapsed
					if (allSourcesCollapsed) {
						collapsedNodes.value.add(id)
					}
				}
			})
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
