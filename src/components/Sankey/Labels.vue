<script setup>
	import {constants} from '@/assets/constants'
	import {select} from 'd3-selection'
	import {transition} from 'd3-transition'
	import {computed, ref, watchEffect} from 'vue'

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

	// Update the filteredData computation to handle nodes with multiple incoming paths
	const filteredData = computed(() => {
		// If no nodes are collapsed, show all labels
		if (props.collapsedNodes.size === 0) {
			return props.data
		}

		// Create a set to track nodes that should be hidden
		const nodesToHide = new Set()

		// For each node, check if ALL of its source nodes are collapsed
		props.data.forEach(node => {
			// Skip directly collapsed nodes (we'll handle them separately)
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

	watchEffect(() => {
		if (!nodeRef.value) return

		// Create a fresh transition for each effect run
		const t = transition().duration(constants.duration.short)

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
								.transition(t)
								.delay(d => constants.duration.short * (d.depth + 1))
								.attr('opacity', 1)
						),
				update => update.text(d => d[props.nodeId]),
				exit => exit.remove()
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
