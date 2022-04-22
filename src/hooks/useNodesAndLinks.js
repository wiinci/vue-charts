/**
 * @param {props} object all props
 *
 * @returns {object} the sankey nodes and links
 */
import { sankey, sankeyJustify, sankeyLeft } from 'd3-sankey';
import { computed } from 'vue';

const useNodesAndLinks = props => {
  const nodeById = new Map();

  const align = computed(() =>
    props.nodeAlign === 'justify' ? sankeyJustify : sankeyLeft
  );

  const chartHeight = computed(
    () => props.height - props.marginTop - props.marginBottom
  );

  const chartWidth = computed(
    () => props.width - props.marginLeft - props.marginRight
  );

  const sort = computed(() => (props.sort ? null : undefined));

  const fn = computed(() =>
    sankey()
      .nodeAlign(align.value)
      .nodeId(d => d[props.nodeId])
      .nodePadding(props.nodePadding)
      .nodeSort(sort.value)
      .nodeWidth(props.nodeWidth)
      .extent([
        [0, 0],
        [chartWidth.value, chartHeight.value],
      ])
  );

  // Sankey requires a value (or weight) and since we're showing a lineage, we need to set the value to 1
  if (!props.data[0].value) {
    props.data.map(d => (d.value = 1));
  }

  for (const link of props.data) {
    if (!nodeById.has(link.source)) {
      nodeById.set(link.source, {
        [props.nodeId]: link.source,
      });
    }

    if (!nodeById.has(link.target)) {
      nodeById.set(link.target, {
        [props.nodeId]: link.target,
      });
    }
  }

  const sankeyData = {
    nodes: Array.from(nodeById.values()),
    links: props.data,
  };

  const { nodes, links } = fn.value({
    nodes: sankeyData.nodes.map(d => Object.assign({}, d)),
    links: sankeyData.links.map(d => Object.assign({}, d)),
  });

  return {
    chartWidth,
    links,
    nodes,
  };
};

export default useNodesAndLinks;