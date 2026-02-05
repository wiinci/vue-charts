import { describe, expect, it } from "vitest";
import { computed, nextTick, ref } from "vue";
import { useCollapsed } from "../useCollapsed";
import { SankeyLink, SankeyNode } from "../useNodesAndLinks";

describe("useCollapsed", () => {
  // Helpers
  const createNode = (id: string, depth = 0, height = 0): SankeyNode => ({
    id,
    x0: 0,
    x1: 0,
    y0: 0,
    y1: 0,
    value: 0,
    depth,
    height,
    sourceLinks: [],
    targetLinks: [],
  });

  // A -> B -> C
  const setupSimpleChain = () => {
    const a = createNode("A", 0, 2);
    const b = createNode("B", 1, 1);
    const c = createNode("C", 2, 0);

    const linkAB = { source: a, target: b, value: 1 } as unknown as SankeyLink;
    const linkBC = { source: b, target: c, value: 1 } as unknown as SankeyLink;

    a.sourceLinks = [linkAB];
    b.targetLinks = [linkAB];
    b.sourceLinks = [linkBC];
    c.targetLinks = [linkBC];

    const nodes = ref([a, b, c]);
    const links = ref([linkAB, linkBC]);

    return { nodes, links, a, b, c, linkAB, linkBC };
  };

  it("toggles collapse state", () => {
    const { nodes, links } = setupSimpleChain();
    const { collapsedNodes, toggleCollapse } = useCollapsed(
      computed(() => nodes.value),
      computed(() => links.value),
    );

    toggleCollapse("A");
    expect(collapsedNodes.value.has("A")).toBe(true);

    toggleCollapse("A");
    expect(collapsedNodes.value.has("A")).toBe(false);
  });

  it("cascades collapse to downstream nodes", async () => {
    const { nodes, links } = setupSimpleChain();
    const { collapsedNodes, toggleCollapse, filteredNodes } = useCollapsed(
      computed(() => nodes.value),
      computed(() => links.value),
    );

    // Collapse A. Since B's only source is A, B should be "implicitly" collapsed/hidden via filteredNodes logic?
    // Wait, useCollapsed adds to `collapsedNodes` explicitly in `toggleCollapse` via recursion?
    // Let's check logic:
    // toggleCollapse(A) -> adds A.
    // check downstream (B). isRootSource? No.
    // shouldCollapseDescendant(A, B) -> incomingLinks all from A? Yes. -> returns true.
    // Adds B to collapsedNodes.
    // Checks downstream of B (C). shouldCollapseDescendant(A, C) -> incoming from B. B is collapsed? Not yet in the set check?
    // It's sequential in recursion.
    // If B added, then C check sees B as immediate source?

    toggleCollapse("A");

    expect(collapsedNodes.value.has("A")).toBe(true);
    // Expect B and C to be added to collapsedNodes because they depend entirely on A
    expect(collapsedNodes.value.has("B")).toBe(true);
    expect(collapsedNodes.value.has("C")).toBe(true);

    // Now filteredNodes should rely on `collapsedDescendants`.
    // Wait for watchEffect
    await nextTick();

    // If A is collapsed, A is visible (root of collapse), but its descendants B and C should be hidden?
    // filteredNodes logic: !collapsedDescendants.has(n.id).
    // collapsedDescendants logic traverses from collapsed nodes.

    // B should be in collapsedDescendants?
    // If B is in collapsedNodes, is it also in collapsedDescendants?
    // Logic: dfs from collapsed node.

    const fNodes = filteredNodes.value.map((n) => n.id);
    expect(fNodes).toContain("A");
    expect(fNodes).not.toContain("B");
    expect(fNodes).not.toContain("C");
  });

  it("uncollapses downstream when expanding", () => {
    const { nodes, links } = setupSimpleChain();
    const { collapsedNodes, toggleCollapse } = useCollapsed(
      computed(() => nodes.value),
      computed(() => links.value),
    );

    toggleCollapse("A"); // collapse all
    expect(collapsedNodes.value.size).toBe(3);

    toggleCollapse("A"); // expand
    expect(collapsedNodes.value.size).toBe(0);
  });

  it("partial collapse (multiple parents)", async () => {
    // A -> C
    // B -> C
    // If I collapse A, C should NOT collapse because B is still active.

    const a = createNode("A", 0, 1);
    const b = createNode("B", 0, 1);
    const c = createNode("C", 1, 0);

    const linkAC = { source: a, target: c, value: 1 } as unknown as SankeyLink;
    const linkBC = { source: b, target: c, value: 1 } as unknown as SankeyLink;

    a.sourceLinks = [linkAC];
    b.sourceLinks = [linkBC];
    c.targetLinks = [linkAC, linkBC];

    const nodes = ref([a, b, c]);
    const links = ref([linkAC, linkBC]);

    const { collapsedNodes, toggleCollapse, filteredNodes } = useCollapsed(
      computed(() => nodes.value),
      computed(() => links.value),
    );

    toggleCollapse("A");
    expect(collapsedNodes.value.has("A")).toBe(true);
    expect(collapsedNodes.value.has("C")).toBe(false); // C has another source B

    await nextTick();
    const fNodes = filteredNodes.value.map((n) => n.id);
    expect(fNodes).toContain("C"); // C should still be visible
  });
});
