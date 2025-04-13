<script setup>
	import {constants} from '@/assets/constants'
	import {select} from 'd3-selection'
	import {proxyRefs, ref, watchEffect, computed} from 'vue'

	const props = defineProps({
		data: {
			type: Array,
			required: true,
		},
		nodeId: {
			required: true,
			type: String,
		},
		xAccessor: {
			required: true,
			type: Function,
		},
		yAccessor: {
			required: true,
			type: Function,
		},
		collapsedNodes: {
			type: Set,
			required: true,
		},
	})

	const nodeRef = ref(null)

	// Update the filteredData to handle nodes with multiple incoming paths
	const filteredData = computed(() => {
		// If no nodes are collapsed, show all nodes
		if (props.collapsedNodes.size === 0) {
			return props.data
		}

		// Create a set to track nodes that should be hidden
		const nodesToHide = new Set()

		// For each node, check if ALL of its source nodes are collapsed
		props.data.forEach(node => {
			// Skip nodes not in the collapsed set
			if (!props.collapsedNodes.has(node.id)) {
				return
			}

			// If the node has no incoming links, it's a source node
			if (!node.targetLinks || node.targetLinks.length === 0) {
				// For source nodes in the collapsed set, they should only be visible
				// if they are "root collapsed" nodes (ones directly clicked)
				const isRootCollapsed =
					!node.targetLinks ||
					node.targetLinks.every(
						link => !props.collapsedNodes.has(link.source.id)
					)

				if (!isRootCollapsed) {
					nodesToHide.add(node.id)
				}
				return
			}

			// For nodes with incoming links, check if ALL source nodes are collapsed
			const allSourcesCollapsed = node.targetLinks.every(link =>
				props.collapsedNodes.has(link.source.id)
			)

			// If all sources are collapsed, this node should be hidden
			if (allSourcesCollapsed) {
				nodesToHide.add(node.id)
			}
		})

		// Filter the data to include:
		// 1. Nodes not in the collapsed set
		// 2. Nodes in collapsed set but not in nodesToHide (these are root collapsed nodes)
		return props.data.filter(node => {
			// If the node is not in the collapsed set, show it
			if (!props.collapsedNodes.has(node.id)) {
				return true
			}

			// If the node is determined to be hidden, don't show it
			if (nodesToHide.has(node.id)) {
				return false
			}

			// Otherwise show the node (it's a root collapsed node)
			return true
		})
	})

	// Reactively update when dependencies change
	watchEffect(() => {
		if (!nodeRef.value) return

		const {nodeId, xAccessor, yAccessor} = proxyRefs(props)

		select(nodeRef.value)
			.selectAll('rect')
			.data(filteredData.value, d => d[nodeId])
			.join(
				enter =>
					enter
						.append('rect')
						.attr('fill', 'none')
						.attr('height', d => d.y1 - d.y0)
						.attr('width', d => d.x1 - d.x0)
						.attr('x', xAccessor)
						.attr('y', yAccessor)
						.attr('opacity', 1e-9)
						.call(enter =>
							enter
								.transition()
								.delay(d => constants.duration.medium * (d.depth + 1))
								.attr('opacity', 1)
						),
				update =>
					update
						.transition()
						.attr('height', d => d.y1 - d.y0)
						.attr('width', d => d.x1 - d.x0)
						.attr('x', xAccessor)
						.attr('y', yAccessor),
				exit => exit.transition().attr('opacity', 1e-9).remove()
			)
	})
</script>

<template>
	<g
		class="nodes"
		ref="nodeRef"
	/>
</template>
