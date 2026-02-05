import { computed, ComputedRef, ref, Ref, watchEffect } from "vue";
import { SankeyLink, SankeyNode } from "./useNodesAndLinks";

export interface CollapsedResult {
  collapsedNodes: Ref<Set<string>>;
  filteredLinks: ComputedRef<SankeyLink[]>;
  filteredNodes: ComputedRef<SankeyNode[]>;
  toggleCollapse: (nodeOrId: string | SankeyNode) => void;
}

export function useCollapsed(
  nodes: ComputedRef<SankeyNode[]>,
  links: ComputedRef<SankeyLink[]>,
): CollapsedResult {
  const collapsedNodes = ref<Set<string>>(new Set());

  /**
   * Get a node by its ID from the nodes array
   */
  function getNodeById(id: string): SankeyNode | undefined {
    return nodes.value.find((n) => n.id === id);
  }

  /**
   * Check if all source nodes of a given node are collapsed
   */
  function allSourcesCollapsed(node: SankeyNode): boolean {
    if (!node.targetLinks || node.targetLinks.length === 0) {
      return false;
    }
    return node.targetLinks.every((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : (link.source as string);
      return collapsedNodes.value.has(sourceId);
    });
  }

  /**
   * Expand all the downstream nodes from a particular node
   */
  function expandDownstream(nodeId: string): void {
    const node = getNodeById(nodeId);
    if (!node || !node.sourceLinks) return;

    node.sourceLinks.forEach((link) => {
      const targetId = typeof link.target === "object" ? link.target.id : (link.target as string);
      const targetNode = getNodeById(targetId);

      if (!targetNode) return;

      if (!allSourcesCollapsed(targetNode) && collapsedNodes.value.has(targetId)) {
        collapsedNodes.value.delete(targetId);
        expandDownstream(targetId);
        return;
      }
      if (!collapsedNodes.value.has(targetId)) {
        expandDownstream(targetId);
      }
    });
  }

  /**
   * Collect all downstream node IDs from a particular node
   */
  function collectDownstream(
    nodeId: string,
    visited = new Set<string>(),
    sourceDepth?: number,
  ): Set<string> {
    const node = getNodeById(nodeId);
    const currentDepth = sourceDepth ?? node?.depth ?? 0;
    visited.add(nodeId);

    if (!node?.sourceLinks) {
      return visited;
    }

    node.sourceLinks.forEach((link) => {
      const targetNode =
        typeof link.target === "object"
          ? (link.target as SankeyNode)
          : getNodeById(link.target as string);
      if (!targetNode) return;

      const targetDepth = targetNode.depth ?? currentDepth + 1;
      if (targetDepth <= currentDepth) return;

      if (!visited.has(targetNode.id)) {
        collectDownstream(targetNode.id, visited, targetDepth);
      }
    });

    return visited;
  }

  /**
   * Find all source root nodes that lead to a given node
   */
  function findNodeRootSources(nodeId: string, visited = new Set<string>()): Set<string> {
    visited.add(nodeId);
    const node = getNodeById(nodeId);

    if (!node) return new Set<string>();

    // If node has no incoming links, it's a root source
    if (!node.targetLinks || node.targetLinks.length === 0) {
      return new Set([nodeId]);
    }

    // Otherwise, recursively find all root source nodes
    const roots = new Set<string>();
    node.targetLinks.forEach((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : (link.source as string);

      if (!visited.has(sourceId)) {
        findNodeRootSources(sourceId, visited).forEach((r) => roots.add(r));
      }
    });

    return roots;
  }

  /**
   * Toggle the collapsed state of a node
   */
  // Helper: decide if a downstream node should be collapsed when a parent collapses
  function shouldCollapseDescendant(parentId: string, dId: string, isRootSource: boolean): boolean {
    const downstreamNode = getNodeById(dId);
    if (!downstreamNode) return false;

    const incomingLinks = downstreamNode.targetLinks ?? [];
    if (incomingLinks.length === 0) {
      return downstreamNode.height === 0;
    }

    const immediateSourcesCollapsed = incomingLinks.every((link) => {
      const srcId = typeof link.source === "object" ? link.source.id : link.source;
      return srcId === parentId || collapsedNodes.value.has(srcId);
    });

    if (downstreamNode.height === 0) {
      return immediateSourcesCollapsed;
    }

    if (isRootSource) {
      const roots = findNodeRootSources(dId);
      return Array.from(roots).every(
        (rootId) => rootId === parentId || collapsedNodes.value.has(rootId),
      );
    }
    return immediateSourcesCollapsed;
  }

  function toggleCollapse(nodeOrId: string | SankeyNode): void {
    const id = typeof nodeOrId === "object" ? nodeOrId.id : nodeOrId;

    // If node is already collapsed, expand it
    if (collapsedNodes.value.has(id)) {
      collapsedNodes.value.delete(id);
      expandDownstream(id);
      return;
    }

    // Otherwise, collapse the node and evaluate descendants
    collapsedNodes.value.add(id);
    const current = getNodeById(id);
    if (!current) return;
    const isRootSource = !current.targetLinks || current.targetLinks.length === 0;
    const downstream = collectDownstream(id);
    downstream.delete(id);
    downstream.forEach((dId) => {
      if (shouldCollapseDescendant(id, dId, isRootSource)) {
        collapsedNodes.value.add(dId);
      }
    });
  }

  /**
   * Track collapsed descendants of collapsed nodes via watchEffect
   */
  const collapsedDescendants = ref<Set<string>>(new Set());

  watchEffect(() => {
    const desc = new Set<string>();
    const collapsed = collapsedNodes.value;
    if (collapsed.size === 0) {
      collapsedDescendants.value = desc;
      return;
    }

    function dfs(node: SankeyNode, depth: number, branchMaxDepth: number) {
      if (!node.sourceLinks) return;
      node.sourceLinks.forEach((link) => {
        const targetNode =
          typeof link.target === "object"
            ? (link.target as SankeyNode)
            : getNodeById(link.target as string);
        if (!targetNode) return;
        const targetDepth = targetNode.depth ?? depth + 1;
        if (targetDepth > branchMaxDepth) return;
        if (allSourcesCollapsed(targetNode) && !desc.has(targetNode.id)) {
          desc.add(targetNode.id);
          dfs(targetNode, targetDepth, branchMaxDepth);
        }
      });
    }

    collapsed.forEach((id) => {
      const root = getNodeById(id);
      if (!root) return;
      const rootDepth = root.depth ?? 0;
      const branchMaxDepth =
        root.height !== undefined ? rootDepth + root.height : Number.POSITIVE_INFINITY;
      dfs(root, rootDepth, branchMaxDepth);
    });

    collapsedDescendants.value = desc;
  });

  /**
   * Filter links to hide outgoing connections from collapsed nodes and any link involving descendants
   */
  const filteredLinks = computed((): SankeyLink[] =>
    links.value.filter((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : (link.source as string);
      const targetId = typeof link.target === "object" ? link.target.id : (link.target as string);
      // Hide links outgoing from collapsed nodes
      if (collapsedNodes.value.has(sourceId)) return false;
      // Hide links involving any collapsed descendants
      if (collapsedDescendants.value.has(sourceId) || collapsedDescendants.value.has(targetId))
        return false;
      return true;
    }),
  );

  /**
   * Filter nodes to exclude any descendants of collapsed nodes (but keep collapsed roots)
   */
  const filteredNodes = computed((): SankeyNode[] =>
    nodes.value.filter((n) => !collapsedDescendants.value.has(n.id)),
  );

  return {
    collapsedNodes,
    filteredLinks,
    filteredNodes,
    toggleCollapse,
  };
}
