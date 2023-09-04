<script setup lang="ts">
import {scaleBand} from 'd3-scale'
import {computed, ref, watch} from 'vue'

interface Datum {
	date: Date
	value: number
}

const props = defineProps<{
	data: Datum[]
	height: number
	width: number
	moveTo: {
		d: Datum
		i: number
	}
}>()

const x = computed(() =>
	scaleBand()
		.domain(props.data.map(d => d.date.toUTCString()))
		.padding(0)
		.range([0, props.width])
)

const transform = ref(0)
watch(
	() => props.moveTo,
	() => {
		transform.value = x.value(props.moveTo.d.date.toUTCString())
	}
)
</script>

<template>
	<g
		:transform="`translate(${transform}, 0)`"
		class="tooltip"
	>
		<path
			:d="`M0 0 V${props.height}`"
			stroke="red"
			strokeWidth="2"
		/>
	</g>
</template>
