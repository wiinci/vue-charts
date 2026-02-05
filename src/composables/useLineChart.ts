import { extent, max } from "d3-array";
import { scaleLinear, scaleUtc } from "d3-scale";
import { curveStep, line as lineFunc } from "d3-shape";
import { computed, Ref } from "vue";

export interface LineChartDatum {
  date: Date;
  value: number;
}

export interface LineChartProps {
  data: LineChartDatum[];
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export function useLineChart(props: Ref<LineChartProps>) {
  const innerWidth = computed(() => {
    const w =
      props.value.width - props.value.marginLeft - props.value.marginRight;
    return Math.max(0, w);
  });

  const innerHeight = computed(() => {
    const h =
      props.value.height - props.value.marginTop - props.value.marginBottom;
    return Math.max(0, h);
  });

  const xScale = computed(() =>
    scaleUtc()
      .domain(extent(props.value.data, (d) => d.date) as [Date, Date])
      .range([0, innerWidth.value]),
  );

  const yScale = computed(() =>
    scaleLinear()
      .domain([0, max(props.value.data, (d) => d.value) as number])
      .range([innerHeight.value, 0]),
  );

  const lineGenerator = computed(() =>
    lineFunc<LineChartDatum>()
      .x((d) => xScale.value(d.date))
      .y((d) => yScale.value(d.value))
      .curve(curveStep),
  );

  const pathD = computed(() => lineGenerator.value(props.value.data) || "");

  return {
    innerWidth,
    innerHeight,
    xScale,
    yScale,
    pathD,
  };
}
