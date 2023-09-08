<script setup lang="ts">
import {ticks} from 'd3-array'
import {scaleSequential} from 'd3-scale'
import {interpolateTurbo} from 'd3-scale-chromatic'
import {select} from 'd3-selection'
import {computed, onMounted, ref} from 'vue'

const props = withDefaults(
	defineProps<{
		domain: number[]
		end: number
		height: number
		interval: number
		marginBottom: number
		marginTop: number
		start: number
	}>(),
	{
		end: 10,
		interval: 1,
		start: 0,
	}
)

const y1 = computed(() => props.height - props.marginBottom)

const gradientRef = ref<SVGLinearGradientElement | null>(null)

const color = scaleSequential(interpolateTurbo).domain(props.domain)

onMounted(() => {
	select(gradientRef.value)
		.selectAll('stop')
		.data(ticks(props.start, props.interval, props.end))
		.join('stop')
		.attr('offset', d => d)
		.attr('stop-color', d => color.interpolator()(d))
})
</script>

<template>
	<linearGradient
		class="gradient"
		ref="gradientRef"
		id="gradient"
		gradientUnits="userSpaceOnUse"
		x1="0"
		:y1="y1"
		x2="0"
		:y2="props.marginTop"
	/>
</template>
