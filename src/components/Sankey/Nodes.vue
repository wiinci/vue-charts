<script setup lang="ts">
import { constants } from '@/assets/constants'
import { SankeyNode } from '@/composables/useNodesAndLinks'
import { select } from 'd3-selection'
import { transition } from 'd3-transition'
import { inject, ref, Ref, watchEffect } from 'vue'

interface NodeProps {
	data: SankeyNode[] // This will now be the already filtered nodes
	nodeId: string
}

const props = defineProps<NodeProps>()

const emit = defineEmits<{
	(e: 'click', id: string): void
}>()

const nodeRef = ref<SVGGElement | null>(null)
const animationsEnabled = inject<Ref<boolean>>('animationsEnabled', ref(true))

// Reactively update when dependencies change
watchEffect(() => {
	if (!nodeRef.value) return

	const isAnimated = animationsEnabled.value
	const tfast = transition().duration(constants.duration.fast)

	select(nodeRef.value)
		.selectAll('rect')
		.data(props.data, (d: any) => d[props.nodeId])
		.join(
			(enter) =>
				enter
					.append('rect')
					.attr('fill', constants.nodeColor)
					.attr('height', (d: any) => d.height)
					.attr('width', (d: any) => d.width)
					.attr('x', (d: any) => d.x)
					.attr('y', (d: any) => d.y)
					.attr('opacity', isAnimated ? 0 : 1)
					.on('click', (_, d: any) => emit('click', d[props.nodeId]))
					.call((enter) => {
						if (!isAnimated) return

						enter
							.transition(tfast)
							.delay((d: any) => constants.duration.medium * ((d.depth || 0) + 1))
							.attr('opacity', 1)
					}),
			(update) => {
				const base = update
					.attr('height', (d: any) => d.height)
					.attr('width', (d: any) => d.width)
					.attr('x', (d: any) => d.x)
					.attr('y', (d: any) => d.y)
					.attr('opacity', 1)

				if (!isAnimated) {
					return base
				}

				return base.transition(tfast)
			},
			(exit) => {
				if (!isAnimated) {
					exit.remove()
					return
				}

				exit.transition(tfast).attr('opacity', 0).remove()
			},
		)
})
</script>

<template>
	<g class="nodes" ref="nodeRef" />
</template>
