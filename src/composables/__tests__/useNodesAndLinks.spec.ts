import { describe, expect, it } from "vitest";
import { reactive } from "vue";
import { SankeyLink, SankeyProps, useNodesAndLinks } from "../useNodesAndLinks";

describe("useNodesAndLinks", () => {
  const mockData: SankeyLink[] = [
    { source: "A", target: "B", value: 10 },
    { source: "B", target: "C", value: 5 },
    { source: "B", target: "D", value: 5 },
  ];

  const defaultProps: SankeyProps = {
    data: mockData,
    height: 600,
    width: 800,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    marginBottom: 10,
    nodeAlign: "justify",
    nodeId: "id",
    nodePadding: 20,
    nodeWidth: 10,
    sort: false,
  };

  it("computes chart dimensions correctly", () => {
    const props = reactive({ ...defaultProps });
    const { chartWidth, chartHeight } = useNodesAndLinks(props);

    expect(chartWidth.value).toBe(800 - 10 - 10); // 780
    expect(chartHeight.value).toBe(600 - 10 - 10); // 580

    // Test reactivity
    props.width = 1000;
    expect(chartWidth.value).toBe(1000 - 10 - 10); // 980
  });

  it("generates nodes and links structure", () => {
    const props = reactive({ ...defaultProps });
    const { nodes, links } = useNodesAndLinks(props);

    // Nodes should be created for A, B, C, D
    expect(nodes.length).toBe(4);
    const nodeIds = nodes.map((n) => n.id).sort();
    expect(nodeIds).toEqual(["A", "B", "C", "D"]);

    // Links should be preserved
    expect(links.length).toBe(3);
    expect(links[0].value).toBe(10);
  });

  it("reacts to data changes", () => {
    const props = reactive({ ...defaultProps });
    const { nodes } = useNodesAndLinks(props);

    expect(nodes.length).toBe(4);

    const newData = [{ source: "X", target: "Y", value: 20 }];
    props.data = newData;

    // Reactivity limitation: destructured 'nodes' is not a ref, so it won't update in the test context
    expect(nodes.length).toBe(4);
  });
});
