<script setup lang="ts">
import {Delaunay as delaunay} from 'd3-delaunay'
import {ScaleTime} from 'd3-scale'
import {pointer, select} from 'd3-selection'
import {computed, onMounted} from 'vue'

interface Datum {
	date: Date
	value: number
}

const props = defineProps<{
	data: Datum[]
	height: number
	width: number
	x: ScaleTime<number, number, never>
}>()

const emit = defineEmits<{
	'move-to': [
		{
			d: Datum | null
			i: number | null
		}
	]
}>()

const voronoi = computed(() =>
	delaunay.from(
		props.data,
		(d: Datum) => props.x(d.date),
		() => 0
	)
)

const handlePointerMove = (event: PointerEvent, d: Datum[]) => {
	const [x, y] = pointer(event)
	const i = voronoi.value.find(x, y)
	emit('move-to', {d: d[i], i})
}

onMounted(() => {
	select('.voronoi')
		.attr('transform', 'translate(0, 0)')
		.selectAll('rect')
		.data([props.data], (d: Datum) => props.x(d.date))
		.join('rect')
		.attr('height', props.height)
		.attr('width', props.width)
		.attr('fill', 'none')
		.attr('pointer-events', 'all')
		.on('pointermove', (e, d: Datum[]) => handlePointerMove(e, d))
		.on('pointerleave', (_, d: Datum[]) =>
			emit('move-to', {d: d[props.data.length - 1], i: props.data.length - 1})
		)
})
</script>

<template>
	<g class="voronoi" />
</template>
