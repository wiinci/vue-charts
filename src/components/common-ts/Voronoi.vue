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
	marginLeft: number
	marginTop: number
	width: number
	x: ScaleTime<number, number, never>
}>()

const emit = defineEmits<{
	(e: 'moveTo', {d, i}): void
}>()

const transform = computed(
	() => `translate(-${props.marginLeft}, -${props.marginTop})`
)

const voronoi = computed(() =>
	delaunay.from(
		props.data,
		(d: Datum) => props.x(d.date),
		() => 0
	)
)

const pointermove = (event: PointerEvent, d: Datum[]) => {
	const [x, y] = pointer(event)
	const i = voronoi.value.find(x, y)
	emit('moveTo', {d: d[i], i})
}

onMounted(() => {
	select('.voronoi')
		.attr('transform', transform.value)
		.selectAll('rect')
		.data([props.data])
		.join('rect')
		.attr('height', props.height)
		.attr('width', props.width)
		.attr('fill', 'none')
		.attr('pointer-events', 'all')
		.on('pointermove', (e, d: Datum[]) => pointermove(e, d))
		.on('pointerleave', () => emit('moveTo', null))
})
</script>

<template>
	<g
		class="voronoi"
		:transform="transform"
	/>
	<Child />
</template>
