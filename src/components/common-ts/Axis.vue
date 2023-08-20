<script setup lang="ts">
import smartTicks from '@/utils/smartTicks'
import xAxisPatterns from '@/utils/xAxisPatterns'
import yAxisPatterns from '@/utils/yAxisPatterns'
import { axisBottom, axisLeft } from 'd3-axis'
import { ScaleLinear, ScaleTime } from 'd3-scale'
import { select } from 'd3-selection'
import { onMounted, ref } from 'vue'

interface Props {
	height?: number
	width?: number
	x?: ScaleTime<number, number, never>
	y?: ScaleLinear<number, number, never>
}

const props = defineProps<Props>()

const axisRef = ref(null)

// X-axis
onMounted(() => {
	if (props.x) {
		select(axisRef.value).call(
			axisBottom(props.x)
				.ticks(props.width! / 80)
				.tickSizeOuter(0)
		)
		xAxisPatterns({ node: axisRef.value, height: props.height! })
	} else {
		const ticks = smartTicks(props.y!)
		select(axisRef.value).call(axisLeft(props.y!.nice(ticks)).ticks(ticks))
		yAxisPatterns({ node: axisRef.value })
	}
})
</script>

<template>
	<g ref="axisRef" />
</template>
