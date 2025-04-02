<script setup>
	import {Delaunay as delaunay} from 'd3-delaunay'
	import {pointer, select} from 'd3-selection'
	import {computed, onBeforeUnmount, onMounted, proxyRefs, ref} from 'vue'

	const props = defineProps({
		data: {
			type: Array,
			required: true,
		},
		height: {
			required: true,
			type: Number,
		},
		width: {
			required: true,
			type: Number,
		},
		xAccessor: {
			required: true,
			type: Function,
		},
		yAccessor: {
			required: true,
			type: Function,
		},
	})

	const emit = defineEmits(['label:hover', 'label:click'])

	const {data, height, width, xAccessor, yAccessor} = proxyRefs(props)
	const voronoi = computed(() => delaunay.from(data, xAccessor, yAccessor))

	const nodeRef = ref(null)

	onMounted(() => {
		select(nodeRef.value)
			.attr('transform', 'translate(0, 0)')
			.selectAll('rect')
			.data([data])
			.join('rect')
			.attr('height', height)
			.attr('width', width)
			.attr('fill', 'none')
			.attr('pointer-events', 'all')
			.on('pointerleave', () => {
				emit('label:hover', '')
			})
			.on('pointermove', (e, d) => {
				const index = voronoi.value.find(...pointer(e))
				if (index !== undefined) {
					emit('label:hover', d[index] || {})
				}
			})
			.on('click', (e, d) => {
				const index = voronoi.value.find(...pointer(e))
				if (index !== undefined) {
					emit('label:click', d[index] || {})
				}
			})
	})

	onBeforeUnmount(() => {
		select(nodeRef.value)
			.selectAll('rect')
			.on('pointerleave', null)
			.on('pointermove', null)
			.remove()
	})
</script>

<template>
	<g
		class="voronoi"
		ref="nodeRef"
	/>
</template>
