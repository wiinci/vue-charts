<script setup lang="ts">
import Axis from '@/components/common-ts/Axis.vue'
import Chart from '@/components/common-ts/Chart.vue'
import Gradient from '@/components/common-ts/LineGradient.vue'
import Tooltip from '@/components/common-ts/Tooltip.vue'
import Voronoi from '@/components/common-ts/Voronoi.vue'
import Line from '@/components/LineChart/Line.vue'
import { useLineChart, type LineChartDatum } from '@/composables/useLineChart'
import { ascending } from 'd3-array'
import { csvParse } from 'd3-dsv'
import { timeParse } from 'd3-time-format'
import { computed, ref, shallowRef, watch } from 'vue'

const {
	data,
	height = 480,
	marginBottom = 40,
	marginLeft = 50,
	marginRight = 20,
	marginTop = 50,
	width = 960,
} = defineProps<{
	data: LineChartDatum[] | string
	height?: number
	marginBottom?: number
	marginLeft?: number
	marginRight?: number
	marginTop?: number
	width?: number
}>()

const parseTime = timeParse('%Y-%m-%d')

// Memoize CSV parsing: only re-run when `data` changes
const parsed = shallowRef<LineChartDatum[]>([])
watch(
	() => data,
	(str: LineChartDatum[] | string) => {
		if (typeof str === 'string') {
			parsed.value = csvParse(str, (d: any) => {
				d.date = parseTime(d.date.toString())!
				d.value = +d.value
				return d
			}).sort((a: LineChartDatum, b: LineChartDatum) => ascending(a.date, b.date))
		} else {
			parsed.value = str
		}
	},
	{ immediate: true },
)
const cdata = computed(() => parsed.value)

const cwidth = computed(() => width - marginLeft - marginRight)
const cheight = computed(() => height - marginTop - marginBottom)

// Planner
const chartProps = computed(() => ({
	data: cdata.value,
	width,
	height,
	marginTop,
	marginBottom,
	marginLeft,
	marginRight,
}))

const { pathD, xScale, yScale } = useLineChart(chartProps)

// Initialize with a default datum to satisfy the type requirements
const defaultDatum: LineChartDatum = {
	date: new Date(),
	value: 0,
}

const moveTo = ref<{ d: LineChartDatum }>({ d: defaultDatum })
const handleMoveTo = ({ d }: { d: LineChartDatum }) => {
	moveTo.value = { d }
}

const xAccessor = (d: LineChartDatum) => xScale.value(d.date)
</script>

<template>
	<Chart :height="height" :marginLeft="marginLeft" :marginTop="marginTop" :width="width">
		<Tooltip :data="cdata" :height="cheight" :move-to="moveTo" :width="cwidth" />
		<Axis :y="yScale" :width="cwidth" />
		<Gradient
			:domain="yScale.domain()"
			:end="0.8"
			:height="cheight"
			:id="'line-gradient'"
			:marginBottom="marginBottom"
			:marginTop="marginTop"
			:start="0"
			:ticks="10"
		/>
		<Line :pathD="pathD" :gradientId="'line-gradient'" />
		<Axis :height="cheight" :width="cwidth" :x="xScale" />
		<Voronoi
			:classKey="'linechart'"
			:data="cdata"
			:height="cheight"
			:width="cwidth"
			:xAccessor="xAccessor"
			@move-to="handleMoveTo"
		/>
	</Chart>
</template>
