<script setup lang="ts">
import type { ScaleLinear, ScaleTime } from 'd3-scale'
import { BaseType, KeyType, ValueFn, select } from 'd3-selection'
import { line as lineFunc } from 'd3-shape'
import { computed, ref, watchEffect } from 'vue'

// Define the type of data
type datum = {
	date: Date
	value: number
}

interface Props {
	data: datum[]
	x: ScaleTime<number, number, never>
	y: ScaleLinear<number, number, never>
}

// Define the props that are passed to this component
const props = defineProps<Props>()

// Line generator
const line = computed(() =>
	lineFunc(
		(d: datum) => props.x(d.date),
		(d: datum) => props.y(d.value)
	)
)

// Select node and draw line
const lineRef = ref(null)
const pathLength = ref(0)
const keyFunction = (d: datum) => d.date

watchEffect(() => {
	select(lineRef.value)
		.selectAll('path')
		.data(
			[props.data],
			keyFunction as unknown as ValueFn<BaseType, unknown, KeyType>
		)
		.join(
			enter => {
				enter
					.append('path')
					.attr('d', line.value(props.data))
					.attr('stroke-dasharray', function () {
						return (pathLength.value = this.getTotalLength())
					})
					.attr('stroke-dashoffset', pathLength.value)
					.transition()
					.duration(555)
					.attr('stroke-dashoffset', 0)
			},
			update =>
				update.attr('d', line.value(props.data)).attr('stroke-dashoffset', 0),
			exit =>
				exit
					.attr('d', line.value(props.data))
					.attr('stroke-dashoffset', 0)
					.transition()
					.duration(555)
					.attr('stroke-dashoffset', pathLength.value)
					.remove()
		)
})
</script>

<template>
	<g
		:class="$style.line"
		ref="lineRef"
	/>
</template>

<style module>
.line {
	fill: none;
	stroke: steelblue;
	stroke-width: 1.5px;
}
</style>