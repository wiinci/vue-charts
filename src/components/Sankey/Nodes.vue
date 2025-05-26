<script setup lang="ts">
	import {constants} from '@/assets/constants'
	import {SankeyNode} from '@/composables/useNodesAndLinks'
	import {select} from 'd3-selection'
	import {transition} from 'd3-transition'
	import {ref, watchEffect} from 'vue'

	interface NodeProps {
		data: SankeyNode[] // This will now be the already filtered nodes
		nodeId: string
		xAccessor: (d: SankeyNode) => number
		yAccessor: (d: SankeyNode) => number
	}

	const props = defineProps<NodeProps>()

	const emit = defineEmits<{
		(e: 'click', id: string): void
	}>()

	const nodeRef = ref<SVGGElement | null>(null)

	// Reactively update when dependencies change
	watchEffect(() => {
		if (!nodeRef.value) return

		const tshort = transition().duration(constants.duration.short)
		const tfast = transition().duration(constants.duration.fast)

		select(nodeRef.value)
			.selectAll('rect')
			.data(props.data, (d: any) => d[props.nodeId])
			.join(
				enter =>
					enter
						.append('rect')
						.attr('fill', constants.nodeColor)
						.attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
						.attr('width', (d: any) => d.x1 - d.x0)
						.attr('x', (d: any) => props.xAccessor(d))
						.attr('y', (d: any) => props.yAccessor(d))
						.attr('opacity', 0)
						.on('click', (_, d: any) => emit('click', d[props.nodeId]))
						.call(enter =>
							enter
								.transition(tfast)
								.delay(
									(d: any) => constants.duration.medium * ((d.depth || 0) + 1)
								)
								.attr('opacity', 1)
						),
				update =>
					update
						.transition(tfast)
						.attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
						.attr('width', (d: any) => d.x1 - d.x0)
						.attr('x', (d: any) => props.xAccessor(d))
						.attr('y', (d: any) => props.yAccessor(d))
						.attr('opacity', 1),
				exit => exit.transition(tshort).attr('opacity', 0).remove()
			)
	})
</script>

<template>
	<g
		class="nodes"
		ref="nodeRef"
	/>
</template>
