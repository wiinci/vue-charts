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

	// Update the filteredData to ensure source and target properties are properly accessed
	const filteredData = computed(() => {
		const visibleNodes = new Set()

		// Add all nodes that are part of visible links
		props.data.forEach(link => {
			if (
				link.source &&
				link.target &&
				!props.collapsedNodes.has(link.source.id)
			) {
				visibleNodes.add(link.source.id)
				visibleNodes.add(link.target.id)
			}
		})

		return props.data.filter(node => visibleNodes.has(node.id))
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
