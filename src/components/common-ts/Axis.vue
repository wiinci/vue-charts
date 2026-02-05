<script setup lang="ts">
import { formatTime, smartTicks, xAxisPatterns, yAxisPatterns } from '@/utils'
import { AxisScale, axisBottom, axisLeft } from 'd3-axis'
import { NumberValue, ScaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import type { PropType } from 'vue'
import { ref, watchEffect } from 'vue'

const props = defineProps({
	height: Number,
	width: Number,
	x: Function as PropType<AxisScale<Date | NumberValue>>,
	y: Function as PropType<ScaleLinear<number, number, never>>,
})

const axisRef = ref(null)

function axis() {
	return axisBottom(props.x!)
		.ticks(props.width! / 80)
		.tickSizeOuter(0)
		.tickFormat((d) => formatTime({ date: d instanceof Date ? d : new Date(d as number) }))
}

function tickFn(ticks: any) {
	return axisLeft(props.y!.nice(ticks)).tickSize(-props.width!).ticks(ticks)
}

// X-axis & Y-axis reactivity
watchEffect(() => {
	if (!axisRef.value) return

	// Select the group and clear previous content or let D3 axis handle updates?
	// D3 axis handles updates if we call it again.
	// But xAxisPatterns/yAxisPatterns might append things that need clearing?
	// Let's assume standard D3 axis behavior is desired.

	const group = select(axisRef.value)

	if (props.x) {
		group.call(axis() as any)
		xAxisPatterns({
			node: axisRef.value as SVGGElement,
			height: props.height!,
		})
	} else if (props.y) {
		const ticks = smartTicks(props.y!)
		group.call(tickFn(ticks) as any)
		yAxisPatterns({ node: axisRef.value as SVGGElement, width: props.width! })
	}
})
</script>

<template>
	<g ref="axisRef" shapeRendering="geometricprecision" fill="currentColor" />
</template>
