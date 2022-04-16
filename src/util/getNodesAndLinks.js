/**
 * @param {props} object all props
 *
 * @returns {object} the sankey nodes and links
 */
import { sankey, sankeyJustify, sankeyLeft } from 'd3-sankey';
import { computed } from 'vue';

const getNodesAndLinks = props => {
  const {
    data,
    height,
    marginLeft,
    marginRight,
    marginBottom,
    marginTop,
    nodeAlign,
    nodeId,
    nodePadding,
    nodeWidth,
    sort,
    width,
  } = props;

  const align = computed(() =>
    nodeAlign === 'justify' ? sankeyJustify : sankeyLeft
  );
  const chartHeight = computed(() => height - marginTop - marginBottom);
  const chartWidth = computed(() => width - marginLeft - marginRight);
  const sorted = computed(() => (sort ? null : undefined));

  const fn = sankey()
    .nodeAlign(align.value)
    .nodeId(d => d[nodeId])
    .nodePadding(nodePadding)
    .nodeSort(sorted.value)
    .nodeWidth(nodeWidth)
    .extent([
      [0, 0],
      [chartWidth.value, chartHeight.value],
    ]);

  const nodeById = new Map();

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

  const { nodes, links } = fn({
    nodes: sankeyData.nodes.map(d => Object.assign({}, d)),
    links: sankeyData.links.map(d => Object.assign({}, d)),
  });

  return {
    chartWidth,
    links,
    nodes,
  };
};

export default getNodesAndLinks;
