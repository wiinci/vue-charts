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

	// Filter data to exclude nodes that are collapsed
	const filteredData = computed(() => {
		return props.data.filter(node => !props.collapsedNodes.has(node.id))
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
