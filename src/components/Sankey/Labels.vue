<script setup>
	import {constants} from '@/assets/constants'
	import {select} from 'd3-selection'
	import {ref, watchEffect, computed} from 'vue'

	const props = defineProps({
		data: {
			type: Array,
			required: true,
		},
		nodeId: {
			required: true,
			type: String,
		},
		nodeWidth: {
			required: true,
			type: Number,
		},
		width: {
			required: true,
			type: Number,
		},
		collapsedNodes: {
			type: Set,
			required: true,
		},
	})

	const nodeRef = ref(null)

	// Memoize calculations
	const getTextAnchor = computed(
		() => d => d.x0 < props.width / 2 ? 'start' : 'end'
	)
	const getXPosition = computed(() => d => {
		if (props.nodeWidth < 1) return d.x0
		return d.x0 < props.width / 2
			? d.x0 + props.nodeWidth
			: d.x1 - props.nodeWidth
	})
	const getYPosition = computed(() => d => (d.y1 + d.y0) / 2)

	// Update the filteredData computation to properly identify root collapsed nodes
	const filteredData = computed(() => {
		// If no nodes are collapsed, show all labels
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

	watchEffect(() => {
		if (!nodeRef.value) return

		select(nodeRef.value)
			.selectAll('text')
			.data(filteredData.value, d => d[props.nodeId])
			.join(
				enter =>
					enter
						.append('text')
						.text(d => d[props.nodeId])
						.attr('dominant-baseline', 'middle')
						.attr('paint-order', 'stroke')
						.attr('stroke-linecap', 'round')
						.attr('stroke-linejoin', 'round')
						.attr('stroke-width', '6')
						.attr('stroke', 'white')
						.attr('text-anchor', getTextAnchor.value)
						.attr('x', getXPosition.value)
						.attr('y', getYPosition.value)
						.attr('opacity', 1e-9)
						.call(enter =>
							enter
								.transition()
								.delay(d => constants.duration.short * (d.depth + 1))
								.attr('opacity', 1)
						),
				update => update.text(d => d[props.nodeId]),
				exit => exit.transition().attr('opacity', 0).remove()
			)
	})
</script>

<template>
	<g
		:class="$style.labels"
		ref="nodeRef"
	/>
</template>

<style module>
	.labels {
		font-size: 12px;
		font-family: var(--font-family-monospace);
	}
</style>
