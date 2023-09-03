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
		.padding(1 / 3)
		.range([0, props.width])
)

const index = ref(props.moveTo.i)
const posX = computed(
	() => index.value / (x.value.step() * index.value + x.value.bandwidth())
)

watch(
	() => props.moveTo,
	() => {
		index.value = props.moveTo.i!
		console.log(x.value(props.moveTo.d!.date.toUTCString()))
	}
)
</script>

<template>
	<g
		class="tooltip"
		:transform="`translate(${x.step() * index + x.bandwidth()}, 0)`"
	>
		<path
			:d="`M0 0 V${props.height}`"
			stroke="red"
			strokeWidth="2"
			:transform="`translate(${index / (x.step() * index + x.bandwidth())}, 0)`"
		/>
	</g>
</template>
