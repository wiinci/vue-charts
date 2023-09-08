<script setup lang="ts">
import {generateTransition} from '@/utils'
import type {ScaleLinear, ScaleTime} from 'd3-scale'
import {BaseType, KeyType, ValueFn, select} from 'd3-selection'
import {curveStep, line as lineFunc} from 'd3-shape'
import {computed, onMounted, ref} from 'vue'

// Types
type datum = {
	date: Date
	value: number
}

interface Props {
	data: datum[]
	gradientId?: string
	x: ScaleTime<number, number, never>
	y: ScaleLinear<number, number, never>
}

const stroke = computed(() =>
	props.gradientId ? `url(#${props.gradientId})` : 'steelblue'
)

// Props
const props = defineProps<Props>()

// Line generator
const line = computed(() =>
	lineFunc(
		(d: datum) => props.x(d.date),
		(d: datum) => props.y(d.value)
	)
		.defined((d: datum) => !isNaN(d.value))
		.curve(curveStep)
)

// Select node and draw line
const lineRef = ref(null)
const pathLength = ref(0)
const keyFunction = (d: datum) => d.date

onMounted(() => {
	select(lineRef.value)
		.selectAll('path')
		.data(
			[props.data],
			keyFunction as unknown as ValueFn<BaseType, unknown, KeyType>
		)
		.join(
			enter =>
				enter
					.append('path')
					.attr('d', line.value(props.data))
					.attr('stroke-dasharray', function () {
						return (pathLength.value = this.getTotalLength())
					})
					.attr('stroke-dashoffset', pathLength.value)
					.transition(generateTransition({}))
					.attr('stroke-dashoffset', 0),
			update =>
				update.attr('d', line.value(props.data)).attr('stroke-dashoffset', 0),
			exit =>
				exit
					.attr('d', line.value(props.data))
					.attr('stroke-dashoffset', 0)
					.transition(generateTransition({}))
					.duration(555)
					.attr('stroke-dashoffset', pathLength.value)
					.remove()
		)
})
</script>

<template>
	<g
		class="line"
		fill="none"
		ref="lineRef"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
		:stroke="stroke"
	/>
</template>
