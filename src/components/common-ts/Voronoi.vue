<script setup lang="ts">
	import {Delaunay as delaunay} from 'd3-delaunay'
	import {pointer, select} from 'd3-selection'
	import {computed, onMounted, ref, watch} from 'vue'

	interface Datum {
		date: Date
		value: number
		[key: string]: any
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

	const voronoiRef = ref<SVGGElement | null>(null)

	// Memoize the Delaunay computation
	const voronoi = computed(() =>
		delaunay.from(
			props.data,
			d => props.xAccessor(d),
			props.yAccessor ? d => props.yAccessor!(d) : () => 0
		)
	)

	const handlePointerMove = (event: PointerEvent, data: Datum[]) => {
		const [x, y] = pointer(event)
		const i = voronoi.value.find(x, y)
		if (i !== undefined) {
			emit('move-to', {d: data[i]})
		}
	}

	onMounted(() => {
		renderVoronoi()
	})

	watch(() => props.data, renderVoronoi, {deep: true})

	function renderVoronoi() {
		if (!voronoiRef.value) return

		select(voronoiRef.value)
			.selectAll('rect')
			.data([props.data])
			.join('rect')
			.attr('height', props.height)
			.attr('width', props.width)
			.attr('fill', 'none')
			.attr('pointer-events', 'all')
			.on('pointermove', (e: PointerEvent, d: Datum[]) =>
				handlePointerMove(e, d)
			)
			.on('pointerleave', () =>
				emit('move-to', {d: props.data[props.data.length - 1]})
			)
	}
</script>

<template>
	<g
		:class="[classKey, 'voronoi']"
		ref="voronoiRef"
	/>
</template>
