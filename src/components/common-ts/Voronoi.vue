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
		'node-click': [{id: string}]
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

	// Add a click event handler to emit the clicked node's identifier
	const handleClick = (event: PointerEvent, data: Datum[]) => {
		const [x, y] = pointer(event)
		const i = voronoi.value.find(x, y)
		if (i !== undefined && i >= 0 && i < data.length) {
			emit('node-click', {id: data[i].id})
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
			.data([props.data]) // Ensure `props.data` is passed correctly
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
			.on('click', (e: PointerEvent, d: Datum[]) => handleClick(e, d))
	}
</script>

<template>
	<g
		:class="[classKey, 'voronoi']"
		ref="voronoiRef"
	/>
</template>
