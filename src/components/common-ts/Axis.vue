<script setup lang="ts">
	import {formatTime, smartTicks, xAxisPatterns, yAxisPatterns} from '@/utils'
	import {AxisScale, axisBottom, axisLeft} from 'd3-axis'
	import {NumberValue, ScaleLinear} from 'd3-scale'
	import {select} from 'd3-selection'
	import {onMounted, ref} from 'vue'
	import type {PropType} from 'vue'

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
			.tickFormat(d =>
				formatTime({date: d instanceof Date ? d : new Date(d as number)})
			)
	}

	function tickFn(ticks: any) {
		return axisLeft(props.y!.nice(ticks)).tickSize(-props.width!).ticks(ticks)
	}

	// X-axis
	onMounted(() => {
		if (props.x) {
			select(axisRef.value).call(axis() as any)
			if (axisRef.value) {
				xAxisPatterns({
					node: axisRef.value as SVGGElement,
					height: props.height!,
				})
			}
			return
		}
		const ticks = smartTicks(props.y!)
		select(axisRef.value).call(tickFn(ticks) as any)
		if (axisRef.value) {
			yAxisPatterns({node: axisRef.value as SVGGElement, width: props.width!})
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
