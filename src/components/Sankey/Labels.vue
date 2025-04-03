<script setup>
	import {constants} from '@/assets/constants'
	import {select} from 'd3-selection'
	import {proxyRefs, ref, watchEffect} from 'vue'

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
	})

	const nodeRef = ref(null)

	watchEffect(() => {
		const {data, nodeId, nodeWidth, width} = proxyRefs(props)

		select(nodeRef.value)
			.selectAll('text')
			.data(data, d => d[nodeId])
			.join(
				enter =>
					enter
						.append('text')
						.text(d => d[nodeId])
						.attr('dominant-baseline', 'middle')
						.attr('paint-order', 'stroke')
						.attr('stroke-linecap', 'round')
						.attr('stroke-linejoin', 'round')
						.attr('stroke-width', '6')
						.attr('stroke', 'white')
						.attr('text-anchor', d => (d.x0 < width / 2 ? 'start' : 'end'))
						.attr('x', d =>
							nodeWidth < 1
								? d.x0
								: d.x0 < width / 2
								? d.x0 + nodeWidth
								: d.x1 - nodeWidth
						)
						.attr('y', d => (d.y1 + d.y0) / 2)
						.attr('opacity', 1e-9)
						.call(enter =>
							enter
								.transition()
								.delay(d => constants.duration.short * (d.depth + 1))
								.attr('opacity', 1)
						),
				update => update.text(d => d[nodeId]),
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
