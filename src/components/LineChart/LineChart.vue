<script setup lang="ts">
import Axis from "@/components/common-ts/Axis.vue";
import Chart from "@/components/common-ts/Chart.vue";
import Gradient from "@/components/common-ts/LineGradient.vue";
import Tooltip from "@/components/common-ts/Tooltip.vue";
import Voronoi from "@/components/common-ts/Voronoi.vue";
import Line from "@/components/LineChart/Line.vue";
import { ascending, extent, max } from "d3-array";
import { csvParse } from "d3-dsv";
import { scaleLinear, scaleUtc } from "d3-scale";
import { timeParse } from "d3-time-format";
import { computed, shallowRef, watch, ref } from "vue";

type Datum = {
  date: Date;
  value: number;
};

const {
  data,
  height = 480,
  marginBottom = 40,
  marginLeft = 50,
  marginRight = 20,
  marginTop = 50,
  width = 960,
} = defineProps<{
  data: Datum[] | string;
  height?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  width?: number;
}>();

const parseTime = timeParse("%Y-%m-%d");

// Memoize CSV parsing: only re-run when `data` changes
const parsed = shallowRef<Datum[]>([]);
watch(
  () => data,
  (str: Datum[] | string) => {
    if (typeof str === "string") {
      parsed.value = csvParse(str, (d: any) => {
        d.date = parseTime(d.date.toString())!;
        d.value = +d.value;
        return d;
      }).sort((a: Datum, b: Datum) => ascending(a.date, b.date));
    } else {
      parsed.value = str;
    }
  },
  { immediate: true },
);
const cdata = computed(() => parsed.value);

const cwidth = computed(() => width - marginLeft - marginRight);
const cheight = computed(() => height - marginTop - marginBottom);

const x = computed(() =>
  scaleUtc(extent(cdata.value, (d: Datum) => d.date) as [Date, Date], [0, cwidth.value]),
);

const y = computed(() =>
  scaleLinear([0, max(cdata.value, (d: Datum) => d.value) as number], [cheight.value, 0]),
);

// Initialize with a default datum to satisfy the type requirements
const defaultDatum: Datum = {
  date: new Date(),
  value: 0,
};

const moveTo = ref<{ d: Datum }>({ d: defaultDatum });
const handleMoveTo = ({ d }: { d: Datum }) => {
  moveTo.value = { d };
};

const xAccessor = (d: Datum) => x.value(d.date);
</script>

<template>
  <Chart :height="height" :marginLeft="marginLeft" :marginTop="marginTop" :width="width">
    <Tooltip :data="cdata" :height="cheight" :move-to="moveTo" :width="cwidth" />
    <Axis :y="y" :width="cwidth" />
    <Gradient
      :domain="y.domain()"
      :end="0.8"
      :height="cheight"
      :id="'line-gradient'"
      :marginBottom="marginBottom"
      :marginTop="marginTop"
      :start="0"
      :ticks="10"
    />
    <Line :data="cdata" :gradientId="'line-gradient'" :x="x" :y="y" />
    <Axis :height="cheight" :width="cwidth" :x="x" />
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
