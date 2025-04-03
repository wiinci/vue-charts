<script setup lang="ts">
	import {Delaunay as delaunay} from 'd3-delaunay'
	import {pointer, select} from 'd3-selection'
	import {computed, onMounted, proxyRefs} from 'vue'

	interface Datum {
		date: Date
		value: number
	}

	const props = defineProps<{
		classKey: string
		data: Datum[]
		height: number
		width: number
		xAccessor: (d: Datum) => number
		yAccessor?: (d: Datum) => number
	}>()

	const emit = defineEmits<{
		'move-to': [{d: Datum}]
	}>()

	const {data, xAccessor, yAccessor} = proxyRefs(props)
	const voronoi = computed(() =>
		delaunay.from(
			data,
			d => xAccessor(d),
			yAccessor ? d => yAccessor(d) : () => 0
		)
	)

	const handlePointerMove = (event: PointerEvent, d: Datum[]) => {
		const [x, y] = pointer(event)
		const i = voronoi.value.find(x, y)
		if (i !== undefined) {
			emit('move-to', {d: d[i]})
		}
	}

	onMounted(() => {
		select(`.voronoi.${props.classKey}`)
			.attr('transform', 'translate(0, 0)')
			.selectAll('rect')
			.data([props.data], (d: Datum) => props.xAccessor(d))
			.join('rect')
			.attr('height', props.height)
			.attr('width', props.width)
			.attr('fill', 'none')
			.attr('pointer-events', 'all')
			.on('pointermove', (e, d: Datum[]) => handlePointerMove(e, d))
			.on('pointerleave', (_, d: Datum[]) =>
				emit('move-to', {d: d[props.data.length - 1]})
			)
	})
</script>

<template>
	<g
		:class="classKey"
		class="voronoi"
	/>
</template>
