<script setup lang="ts">
import Line from '@/components/LineChart/Line.vue'
import Chart from '@/components/common-ts/Chart.vue'
import { ascending, extent, max } from 'd3-array'
import { csvParse } from 'd3-dsv'
import { scaleLinear, scaleTime } from 'd3-scale'
import { timeParse } from 'd3-time-format'
import { computed } from 'vue'

// Define the type of data
type datum = {
	date: Date
	value: number
}

interface Props {
	data: datum[] | string
	height?: number
	marginBottom?: number
	marginLeft?: number
	marginRight?: number
	marginTop?: number
	width?: number
}

// Define the props that are passed to this component
const props = withDefaults(defineProps<Props>(), {
	height: 480,
	marginBottom: 20,
	marginLeft: 50,
	marginRight: 20,
	marginTop: 20,
	width: 960,
})

// Parse the date
const parseTime = timeParse('%Y-%m-%d')

// Parse data from CSV
const data = computed(() =>
	csvParse(props.data, (d: datum) => {
		d.date = parseTime(d.date.toString())!
		d.value = +d.value
		return d
	}).sort((a: datum, b: datum) => ascending(a.date, b.date))
)

// Define the width and height of the chart
const width = computed(() => props.width - props.marginLeft - props.marginRight)

const height = computed(
	() => props.height - props.marginTop - props.marginBottom
)

// Define the x and y scales
const x = computed(() =>
	scaleTime(extent(data.value, (d: datum) => d.date) as [Date, Date], [
		0,
		width.value,
	])
)

const y = computed(() =>
	scaleLinear(
		[0, max(data.value, (d: datum) => d.value) as number],
		[height.value, 0]
	)
)
</script>

<template>
	<Chart
		:height="props.height"
		:marginLeft="props.marginLeft"
		:marginTop="props.marginTop"
		:width="props.width"
	>
		<!-- <Axis
			orient="Left"
			:scale="y"
		/>
		<Axis
			orient="Bottom"
			:scale="x"
		/> -->
		<Line
			:data="data"
			:x="x"
			:y="y"
		/>
	</Chart>
</template>
