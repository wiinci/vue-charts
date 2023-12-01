<script setup lang="ts">
import {formatTime, smartTicks, xAxisPatterns, yAxisPatterns} from '@/utils'
import {AxisScale, axisBottom, axisLeft} from 'd3-axis'
import {NumberValue, ScaleLinear} from 'd3-scale'
import {select} from 'd3-selection'
import {onMounted, ref} from 'vue'

interface Props {
	height?: number
	width?: number
	x?: AxisScale<Date | NumberValue>
	y?: ScaleLinear<number, number, never>
}

const props = defineProps<Props>()

const axisRef = ref(null)

function axis() {
	return axisBottom(props.x!)
		.ticks(props.width! / 80)
		.tickSizeOuter(0)
		.tickFormat(d => formatTime({date: d}))
}

function tickFn(ticks: any) {
	return axisLeft(props.y!.nice(ticks)).tickSize(-props.width!).ticks(ticks)
}

// X-axis
onMounted(() => {
	if (props.x) {
		select(axisRef.value).call(axis() as any)
		xAxisPatterns({node: axisRef.value, height: props.height!})
	} else {
		const ticks = smartTicks(props.y!)
		select(axisRef.value).call(tickFn(ticks) as any)
		yAxisPatterns({node: axisRef.value, width: props.width!})
	}
})
</script>

<template>
	<g
		ref="axisRef"
		shapeRendering="geometricprecision"
		fill="currentColor"
	/>
</template>
