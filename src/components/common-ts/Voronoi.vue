<script setup lang="ts">
import {Delaunay as delaunay} from 'd3-delaunay'
import {pointer, select} from 'd3-selection'
import {computed, onUnmounted, type PropType, ref, watchEffect} from 'vue'

interface Datum {
	id?: string
	date?: Date
	value?: number
}

const props = defineProps({
	classKey: {
		type: String,
		required: true,
	},
	data: {
		type: Array as PropType<Datum[]>,
		required: true,
	},
	height: {
		type: Number,
		required: true,
	},
	width: {
		type: Number,
		required: true,
	},
	xAccessor: {
		type: Function as PropType<(d: any) => number>,
		required: true,
	},
	yAccessor: Function as PropType<(d: any) => number>,
})

const emit = defineEmits<{
	'move-to': [{d: any}]
	'node-click': [{id: string}]
}>()

const voronoiRef = ref<SVGGElement | null>(null)
let rafId: number | null = null
let pendingX = 0
let pendingY = 0
let pendingData: Datum[] | null = null
const shouldCoalesce = computed(() => props.classKey === 'sankey')

// Memoize the Delaunay computation
const voronoi = computed(() =>
	delaunay.from(
		props.data,
		(d) => props.xAccessor(d),
		props.yAccessor ? (d) => props.yAccessor!(d) : () => 0,
	),
)

const emitNearest = (x: number, y: number, data: Datum[]) => {
	if (!data.length) return

	const i = voronoi.value.find(x, y)
	if (i !== undefined && i >= 0 && i < data.length) {
		emit('move-to', {d: data[i]})
	}
}

const flushPointerMove = () => {
	rafId = null
	if (!pendingData) return

	emitNearest(pendingX, pendingY, pendingData)
}

const handlePointerMove = (event: PointerEvent, data: Datum[]) => {
	if (!data.length) return

	const [x, y] = pointer(event)
	if (!shouldCoalesce.value) {
		emitNearest(x, y, data)
		return
	}

	pendingX = x
	pendingY = y
	pendingData = data

	if (rafId !== null) return
	rafId = window.requestAnimationFrame(flushPointerMove)
}

// Add a click event handler to emit the clicked node's identifier
const handleClick = (event: PointerEvent, data: Datum[]) => {
	const [x, y] = pointer(event)
	const i = voronoi.value.find(x, y)
	if (i !== undefined && i >= 0 && i < data.length) {
		const id = data[i].id
		if (typeof id === 'string') {
			emit('node-click', {id})
		}
	}
}

const handlePointerLeave = () => {
	pendingData = null
	if (!props.data.length) return
	emit('move-to', {d: props.data[props.data.length - 1]})
}

onUnmounted(() => {
	if (rafId !== null) {
		window.cancelAnimationFrame(rafId)
		rafId = null
	}
})

watchEffect(() => {
	if (!voronoiRef.value) return

	select(voronoiRef.value)
		.selectAll('rect')
		.data([props.data]) // Ensure `props.data` is passed correctly
		.join('rect')
		.attr('height', props.height)
		.attr('width', props.width)
		.attr('fill', 'none')
		.attr('pointer-events', 'all')
		.on('pointermove', (e: PointerEvent, d: Datum[]) => handlePointerMove(e, d))
		.on('pointerleave', handlePointerLeave)
		.on('click', (e: PointerEvent, d: Datum[]) => handleClick(e, d))
})
</script>

<template>
	<g :class="[classKey, 'voronoi']" ref="voronoiRef" />
</template>
