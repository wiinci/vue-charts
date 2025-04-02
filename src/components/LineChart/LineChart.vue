<script setup lang="ts">
	import Axis from '@/components/common-ts/Axis.vue'
	import Chart from '@/components/common-ts/Chart.vue'
	import Gradient from '@/components/common-ts/LineGradient.vue'
	import Tooltip from '@/components/common-ts/Tooltip.vue'
	import Voronoi from '@/components/common-ts/Voronoi.vue'
	import Line from '@/components/LineChart/Line.vue'
	import {ascending, extent, max} from 'd3-array'
	import {csvParse} from 'd3-dsv'
	import {scaleLinear, scaleUtc} from 'd3-scale'
	import {timeParse} from 'd3-time-format'
	import {computed, ref} from 'vue'

	type Datum = {
		date: Date
		value: number
	}

	const props = withDefaults(
		defineProps<{
			data: Datum[] | string
			height?: number
			marginBottom?: number
			marginLeft?: number
			marginRight?: number
			marginTop?: number
			width?: number
		}>(),
		{
			height: 480,
			marginBottom: 40,
			marginLeft: 40,
			marginRight: 20,
			marginTop: 20,
			width: 960,
		}
	)

	const parseTime = timeParse('%Y-%m-%d')

	const data = computed(() =>
		csvParse(props.data as unknown as string, (d: any) => {
			d.date = parseTime(d.date.toString())!
			d.value = +d.value
			return d
		}).sort((a: Datum, b: Datum) => ascending(a.date, b.date))
	)

	const width = computed(
		() => props.width - props.marginLeft - props.marginRight
	)
	const height = computed(
		() => props.height - props.marginTop - props.marginBottom
	)

	const x = computed(() =>
		scaleUtc(extent(data.value, (d: Datum) => d.date) as [Date, Date], [
			0,
			width.value,
		])
	)
	const y = computed(() =>
		scaleLinear(
			[0, max(data.value, (d: Datum) => d.value) as number],
			[height.value, 0]
		)
	)

	const moveTo = ref({d: null})
	const handleMoveTo = ({d}: {d: Datum}) => {
		moveTo.value = {d}
	}

	const xAccessor = (d: Datum) => x.value(d.date)
</script>

<template>
	<Chart
		:height="props.height"
		:marginLeft="props.marginLeft"
		:marginTop="props.marginTop"
		:width="props.width"
	>
		<Tooltip
			v-if="moveTo.d"
			:data="data"
			:height="height"
			:move-to="moveTo"
			:width="width"
		/>
		<Axis
			:y="y"
			:width="width"
		/>
		<Gradient
			:domain="y.domain()"
			:end="0.8"
			:height="props.height"
			:id="'line-gradient'"
			:marginBottom="props.marginBottom"
			:marginTop="props.marginTop"
			:start="0"
			:ticks="10"
		/>
		<Line
			:data="data"
			:gradientId="'line-gradient'"
			:x="x"
			:y="y"
		/>
		<Axis
			:height="height"
			:width="width"
			:x="x"
		/>
		<Voronoi
			:data="data"
			:height="height"
			:width="width"
			:x="x"
			:xAccessor="xAccessor"
			@move-to="handleMoveTo"
			key="linechart"
		/>
	</Chart>
</template>
