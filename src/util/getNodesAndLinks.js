/**
 * @param {sankey} function the Sankey function using d3-sankey
 * @param {nodeId} string the key to use for the nodes
 * @param {data} array of links
 * @returns {object} the sankey nodes and links
 */

const getNodesAndLinks = (sankey, nodeId, data) => {
  const nodeById = new Map();

  // Sankey requires a value and since we're showing a lineage, we need to set the value to 1
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

  return sankey({
    nodes: sankeyData.nodes.map(d => Object.assign({}, d)),
    links: sankeyData.links.map(d => Object.assign({}, d)),
  });
};

export default getNodesAndLinks;
