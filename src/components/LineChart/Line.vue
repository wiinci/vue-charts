<script setup lang="ts">
import { constants } from '@/assets/constants'
import { select } from 'd3-selection'
import { transition } from 'd3-transition'
import { computed, ref, watchEffect } from 'vue'

const props = defineProps<{
	pathD: string
	gradientId?: string
}>()

const lineRef = ref<SVGGElement | null>(null)
const stroke = computed(() => (props.gradientId ? `url(#${props.gradientId})` : 'steelblue'))

watchEffect(() => {
	if (!lineRef.value) return

	const t = transition().duration(constants.duration.medium)

	select(lineRef.value)
		.selectAll('path')
		.data([props.pathD])
		.join(
			(enter) => {
				const path = enter
					.append('path')
					.attr('fill', 'none')
					.attr('stroke', stroke.value)
					.attr('stroke-width', 1.5)
					.attr('d', (d) => d)

				// Get the total length for the stroke-dasharray animation
				const totalLength = (path.node() as SVGPathElement)?.getTotalLength() ?? 0

				return path
					.attr('stroke-dasharray', totalLength)
					.attr('stroke-dashoffset', totalLength)
					.call((enter) => enter.transition(t).attr('stroke-dashoffset', 0))
			},
			(update) =>
				update
					.transition(t)
					.attr('stroke', stroke.value)
					.attr('d', (d) => d),
			(exit) => exit.remove(),
		)
})
</script>

<template>
	<g ref="lineRef" />
</template>
