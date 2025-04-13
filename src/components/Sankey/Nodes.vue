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

	// Update the filteredData to properly identify root collapsed nodes
	const filteredData = computed(() => {
		// If no nodes are collapsed, show all nodes
		if (props.collapsedNodes.size === 0) {
			return props.data
		}

		// Create a set to track root collapsed nodes
		const rootCollapsedNodes = new Set()

		// Process each node to identify root collapsed nodes
		props.data.forEach(node => {
			if (props.collapsedNodes.has(node.id)) {
				// A root collapsed node is one that doesn't have any upstream collapsed nodes
				// but has downstream collapsed nodes

				// Check if any upstream nodes (sources) are collapsed
				const hasCollapsedUpstream =
					node.targetLinks &&
					node.targetLinks.some(link =>
						props.collapsedNodes.has(link.source.id)
					)

				// If this node has no collapsed upstream nodes, it's a root collapsed node
				if (!hasCollapsedUpstream) {
					rootCollapsedNodes.add(node.id)
				}
			}
		})

		// Filter the nodes to keep:
		// 1. All non-collapsed nodes
		// 2. Root collapsed nodes
		return props.data.filter(node => {
			// Keep all non-collapsed nodes
			if (!props.collapsedNodes.has(node.id)) {
				return true
			}

			// Keep root collapsed nodes
			if (rootCollapsedNodes.has(node.id)) {
				return true
			}

			return false
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
