import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useLineChart } from "../useLineChart";

describe("useLineChart", () => {
  it("calculates scales and path correctly", () => {
    const data = [
      { date: new Date("2023-01-01"), value: 10 },
      { date: new Date("2023-01-02"), value: 20 },
    ];
    const props = ref({
      data,
      width: 100,
      height: 100,
      marginTop: 10,
      marginBottom: 10,
      marginLeft: 10,
      marginRight: 10,
    });

    const { xScale, yScale, pathD, innerWidth, innerHeight } = useLineChart(props);

    expect(innerWidth.value).toBe(80);
    expect(innerHeight.value).toBe(80);

    expect(xScale.value).toBeDefined();
    expect(yScale.value).toBeDefined();

    const rangeX = xScale.value.range();
    expect(rangeX[1]).toBe(80);

    const rangeY = yScale.value.range();
    expect(rangeY[0]).toBe(80);
    expect(rangeY[1]).toBe(0);

    expect(pathD.value).toContain("M");
  });

  it("handles empty data gracefully", () => {
    const props = ref({
      data: [],
      width: 100,
      height: 100,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    });

    const { pathD } = useLineChart(props);
    expect(pathD.value).toBe("");
  });
});
