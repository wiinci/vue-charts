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
		// Use the node's id for identification
		const nodeId = node.id || node

		if (collapsedNodes.value.has(nodeId)) {
			// EXPAND: Remove this node from the collapsed set
			collapsedNodes.value.delete(nodeId)

			// Process expansion recursively to handle all downstream nodes
			const processExpansion = nodesToCheck => {
				// Track newly expanded nodes to check their downstream nodes in the next round
				const newlyExpandedNodes = []

				// Check each node to see if it should be expanded
				nodesToCheck.forEach(nId => {
					const node = nodes.find(n => n.id === nId)
					if (!node || !node.targetLinks || !collapsedNodes.value.has(nId)) {
						return // Skip if not found, no target links, or already expanded
					}

					// Check if all source nodes for this node are now expanded
					const allSourcesExpanded = node.targetLinks.every(link => {
						const sourceId =
							typeof link.source === 'object' ? link.source.id : link.source
						return !collapsedNodes.value.has(sourceId)
					})

					// If all sources are expanded, we can remove this node from collapsed set
					if (allSourcesExpanded) {
						collapsedNodes.value.delete(nId)
						newlyExpandedNodes.push(nId)

						// Also collect its direct downstream nodes for the next round
						node.sourceLinks?.forEach(link => {
							const targetId =
								typeof link.target === 'object' ? link.target.id : link.target
							if (collapsedNodes.value.has(targetId)) {
								newlyExpandedNodes.push(targetId)
							}
						})
					}
				})

				// If we expanded any nodes, recursively check their downstream nodes
				if (newlyExpandedNodes.length > 0) {
					processExpansion(newlyExpandedNodes)
				}
			}

			// Start the recursive expansion with direct downstream nodes
			const directDownstream = []
			const expandedNode = nodes.find(n => n.id === nodeId)
			if (expandedNode && expandedNode.sourceLinks) {
				expandedNode.sourceLinks.forEach(link => {
					const targetId =
						typeof link.target === 'object' ? link.target.id : link.target
					directDownstream.push(targetId)
				})
			}

			processExpansion(directDownstream)
		} else {
			// COLLAPSE: Add the node to the collapsed set
			collapsedNodes.value.add(nodeId)

			// Get all downstream nodes
			const downstreamNodes = collectDownstreamNodes(nodeId)

			// Find the root sources of the node being collapsed
			const nodeRootSources = findNodeRootSources(nodeId)

			// For each downstream node, determine if it should be collapsed
			downstreamNodes.forEach(id => {
				if (id !== nodeId) {
					// Skip the original node we just processed
					// Find all root sources that can reach this downstream node
					const downstreamNodeRootSources = findNodeRootSources(id)

					// Check if all root sources of this node are also root sources of the collapsed node
					// If so, this node is exclusively dependent on the collapsed subtree and should be collapsed
					let shouldCollapse = true

					downstreamNodeRootSources.forEach(rootSource => {
						// If this root source is not in the collapsed node's root sources,
						// then this downstream node has an independent path and should remain visible
						if (
							!nodeRootSources.has(rootSource) &&
							!collapsedNodes.value.has(rootSource)
						) {
							shouldCollapse = false
						}
					})

					if (shouldCollapse) {
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
