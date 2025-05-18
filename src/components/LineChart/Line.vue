<script setup lang="ts">
	import {generateTransition} from '@/utils'
	import type {ScaleLinear, ScaleTime} from 'd3-scale'
	import {select} from 'd3-selection'
	import {curveStep, line as lineFunc} from 'd3-shape'
	import {computed, onMounted, ref} from 'vue'
	import type {PropType} from 'vue'

	type Datum = {
		date: Date
		value: number
	}

	const props = defineProps({
		data: {
			type: Array as PropType<Datum[]>,
			required: true,
		},
		gradientId: String,
		x: {
			type: Function as PropType<ScaleTime<number, number, never>>,
			required: true,
		},
		y: {
			type: Function as PropType<ScaleLinear<number, number, never>>,
			required: true,
		},
	})

	const stroke = computed(() =>
		props.gradientId ? `url(#${props.gradientId})` : 'steelblue'
	)

	const line = computed(() =>
		lineFunc<Datum>()
			.x(d => props.x(d.date))
			.y(d => props.y(d.value))
			.curve(curveStep)
	)

	const lineRef = ref(null)

	onMounted(() => {
		const path = select(lineRef.value)
			.append('path')
			.datum(props.data)
			.attr('fill', 'none')
			.attr('stroke', stroke.value)
			.attr('stroke-width', 1.5)
			.attr('d', line.value as any)

		const totalLength = path.node()!.getTotalLength()

		path
			.attr('stroke-dasharray', totalLength)
			.attr('stroke-dashoffset', totalLength)
			.transition(generateTransition({}))
			.attr('stroke-dashoffset', 0)
	})
</script>

<template>
	<g ref="lineRef" />
</template>
