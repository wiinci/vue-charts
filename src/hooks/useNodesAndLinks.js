/**
 * @param {props} object all props
 *
 * @returns {object} the sankey nodes and links
 */
import { sankey, sankeyJustify, sankeyLeft } from 'd3-sankey';
import { computed, proxyRefs, shallowReadonly } from 'vue';

const useNodesAndLinks = props => {
  const {
    data,
    height,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    nodeAlign,
    nodeId,
    nodePadding,
    nodeWidth,
    sort,
    width,
  } = proxyRefs(props);

  const nodeById = new Map();

  const align = computed(() =>
    nodeAlign === 'justify' ? sankeyJustify : sankeyLeft
  );

  const chartHeight = computed(() => height - marginTop - marginBottom);

  const chartWidth = computed(() => width - marginLeft - marginRight);

  const offsetStart = computed(() => marginLeft + marginRight);

  const offsetEnd = computed(() => marginTop + marginBottom);

  const sorted = computed(() => (sort ? null : undefined));

  const fn = computed(() =>
    sankey()
      .nodeAlign(align.value)
      .nodeId(d => d[nodeId])
      .nodePadding(nodePadding)
      .nodeSort(sorted.value)
      .nodeWidth(nodeWidth)
      .extent([
        [offsetStart.value, offsetEnd.value],
        [chartWidth.value, chartHeight.value],
      ])
  );

  // Sankey requires a value (or weight) and since we're showing a lineage, we need to set the value to 1
  if (!data[0].value) {
    data.map(d => (d.value = 1));
  }

  for (const link of data) {
    if (!nodeById.has(link.source)) {
      nodeById.set(link.source, {
        [nodeId]: link.source,
      });
    }

    if (!nodeById.has(link.target)) {
      nodeById.set(link.target, {
        [nodeId]: link.target,
      });
    }
  }

  const sankeyData = {
    nodes: Array.from(nodeById.values()),
    links: data,
  };

  const { nodes, links } = fn.value({
    nodes: sankeyData.nodes.map(d => Object.assign({}, d)),
    links: sankeyData.links.map(d => Object.assign({}, d)),
  });

  return {
    chartHeight,
    chartWidth,
    links: shallowReadonly(links),
    nodes: shallowReadonly(nodes),
  };
};

export default useNodesAndLinks;
