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
		toggledId: {
			required: true,
			type: String,
		},
		toggledState: {
			required: true,
			type: Boolean,
		},
		width: {
			required: true,
			type: Number,
		},
	})

	const emit = defineEmits(['nodes:hidden'])

	const nodeRef = ref(null)

	const nodesToToggle = n => {
		const toggled = []
		if (n.sourceLinks?.length > 0) {
			for (const node of n.sourceLinks) {
				toggled.push(node.target.id, ...nodesToToggle(node.target))
			}
		}
		return toggled
	}

	watchEffect(() => {
		const {data, nodeId, nodeWidth, toggledId, toggledState, width} =
			proxyRefs(props)
		const toggledNode = data.find(d => d.id === toggledId)
		if (toggledNode) {
			toggledNode.collapsed = toggledState

			const toggledNodes = toggledState ? nodesToToggle(toggledNode) : []
			emit('nodes:hidden', toggledNodes)
		}

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
				update =>
					update.text(d => (toggledNodes.includes(d.id) ? null : d[nodeId])),
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
