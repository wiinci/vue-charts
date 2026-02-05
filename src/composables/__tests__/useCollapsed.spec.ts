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

  describe("Complex Scenarios", () => {
    // Helper to extract ID safely since source/target can be string | SankeyNode
    const getId = (n: SankeyNode | string) =>
      typeof n === "string" ? n : n.id;

    // Helper to quick link
    const link = (source: SankeyNode, target: SankeyNode) => {
      const l = { source, target, value: 1 } as unknown as SankeyLink;
      source.sourceLinks!.push(l);
      target.targetLinks!.push(l);
      return l;
    };

    /**
     * K -> L -> M -> N
     * K -> O -> M -> N
     */
    it("Scenario 1: Diamond merge (K->L->M->N, K->O->M->N)", async () => {
      const k = createNode("K", 0);
      const l = createNode("L", 1);
      const o = createNode("O", 1);
      const m = createNode("M", 2);
      const n = createNode("N", 3);

      const linksList = [
        link(k, l),
        link(k, o),
        link(l, m),
        link(o, m),
        link(m, n),
      ];
      const nodesList = [k, l, o, m, n];

      const { collapsedNodes, toggleCollapse, filteredLinks } = useCollapsed(
        computed(() => nodesList),
        computed(() => linksList),
      );

      // 1. With all nodes expanded, clicking L keeps the K -> O -> M -> N connection intact
      // and only hides the link between L and M
      toggleCollapse("L");
      await nextTick();

      expect(collapsedNodes.value.size).toBe(1);
      expect(collapsedNodes.value.has("L")).toBe(true);
      // M should NOT be collapsed because O is still active
      expect(collapsedNodes.value.has("M")).toBe(false);

      // Check visible links
      const visibleLinks = filteredLinks.value;
      // K->L should be visible
      expect(
        visibleLinks.some(
          (link) => getId(link.source) === "K" && getId(link.target) === "L",
        ),
      ).toBe(true);
      // K->O should be visible
      expect(
        visibleLinks.some(
          (link) => getId(link.source) === "K" && getId(link.target) === "O",
        ),
      ).toBe(true);
      // O->M should be visible
      expect(
        visibleLinks.some(
          (link) => getId(link.source) === "O" && getId(link.target) === "M",
        ),
      ).toBe(true);
      // M->N should be visible
      expect(
        visibleLinks.some(
          (link) => getId(link.source) === "M" && getId(link.target) === "N",
        ),
      ).toBe(true);

      // L->M should be hidden
      expect(
        visibleLinks.some(
          (link) => getId(link.source) === "L" && getId(link.target) === "M",
        ),
      ).toBe(false);

      // Reset
      toggleCollapse("L"); // uncollapse
      expect(collapsedNodes.value.size).toBe(0);

      // 2. With all nodes expanded, clicking O keeps the K -> L -> M -> N connection intact
      // and only hides the link between O and M
      toggleCollapse("O");
      await nextTick();
      expect(collapsedNodes.value.has("O")).toBe(true);
      expect(collapsedNodes.value.has("M")).toBe(false);

      const visibleLinks2 = filteredLinks.value;
      expect(
        visibleLinks2.some(
          (link) => getId(link.source) === "K" && getId(link.target) === "L",
        ),
      ).toBe(true);
      expect(
        visibleLinks2.some(
          (link) => getId(link.source) === "L" && getId(link.target) === "M",
        ),
      ).toBe(true);
      expect(
        visibleLinks2.some(
          (link) => getId(link.source) === "M" && getId(link.target) === "N",
        ),
      ).toBe(true);

      // O->M hidden
      expect(
        visibleLinks2.some(
          (link) => getId(link.source) === "O" && getId(link.target) === "M",
        ),
      ).toBe(false);

      // Reset
      toggleCollapse("O");

      // 3. When either of L or O nodes are collapsed, clicking the other one will result in
      // K -> L and K -> O to be in view with their child nodes and links collapsed and hidden from view
      toggleCollapse("L");
      toggleCollapse("O");
      await nextTick();

      // Now both L and O are collapsed.
      // M should be collapsed because both its parents are collapsed.
      expect(collapsedNodes.value.has("L")).toBe(true);
      expect(collapsedNodes.value.has("O")).toBe(true);
      expect(collapsedNodes.value.has("M")).toBe(true); // Auto-collapsed

      // Links:
      const visibleLinks3 = filteredLinks.value;
      // K->L visible
      expect(
        visibleLinks3.some(
          (link) => getId(link.source) === "K" && getId(link.target) === "L",
        ),
      ).toBe(true);
      // K->O visible
      expect(
        visibleLinks3.some(
          (link) => getId(link.source) === "K" && getId(link.target) === "O",
        ),
      ).toBe(true);

      // L->M hidden
      expect(
        visibleLinks3.some(
          (link) => getId(link.source) === "L" && getId(link.target) === "M",
        ),
      ).toBe(false);
      // O->M hidden
      expect(
        visibleLinks3.some(
          (link) => getId(link.source) === "O" && getId(link.target) === "M",
        ),
      ).toBe(false);
      // M->N hidden (descendant of collapsed)
      expect(
        visibleLinks3.some(
          (link) => getId(link.source) === "M" && getId(link.target) === "N",
        ),
      ).toBe(false);
    });

    /**
     * P -> Q -> R
     * S -> Q -> R
     */
    it("Scenario 2: Multi-root merge (P->Q->R, S->Q->R)", async () => {
      const p = createNode("P", 0);
      const s = createNode("S", 0);
      const q = createNode("Q", 1);
      const r = createNode("R", 2);

      const linksList = [link(p, q), link(s, q), link(q, r)];
      const nodesList = [p, s, q, r];

      const { collapsedNodes, toggleCollapse, filteredLinks } = useCollapsed(
        computed(() => nodesList),
        computed(() => linksList),
      );

      // 1. With all nodes expanded, clicking P keeps the S -> Q -> R connection intact
      // and only hides/collapses the P -> Q link
      toggleCollapse("P");
      await nextTick();
      expect(collapsedNodes.value.has("P")).toBe(true);
      expect(collapsedNodes.value.has("Q")).toBe(false); // S is still active

      const visibleLinks = filteredLinks.value;
      // S->Q->R visible
      expect(
        visibleLinks.some(
          (link) => getId(link.source) === "S" && getId(link.target) === "Q",
        ),
      ).toBe(true);
      expect(
        visibleLinks.some(
          (link) => getId(link.source) === "Q" && getId(link.target) === "R",
        ),
      ).toBe(true);
      // P->Q hidden
      expect(
        visibleLinks.some(
          (link) => getId(link.source) === "P" && getId(link.target) === "Q",
        ),
      ).toBe(false);

      // Reset
      toggleCollapse("P");

      // 2. With all nodes expanded, clicking S keeps the P -> Q -> R connection intact
      // and only hides/collapses the S -> Q link
      toggleCollapse("S");
      await nextTick();
      expect(collapsedNodes.value.has("S")).toBe(true);
      expect(collapsedNodes.value.has("Q")).toBe(false); // P is still active

      const visibleLinks2 = filteredLinks.value;
      // P->Q->R visible
      expect(
        visibleLinks2.some(
          (link) => getId(link.source) === "P" && getId(link.target) === "Q",
        ),
      ).toBe(true);
      expect(
        visibleLinks2.some(
          (link) => getId(link.source) === "Q" && getId(link.target) === "R",
        ),
      ).toBe(true);
      // S->Q hidden
      expect(
        visibleLinks2.some(
          (link) => getId(link.source) === "S" && getId(link.target) === "Q",
        ),
      ).toBe(false);

      // Reset
      toggleCollapse("S");

      // 3. When either of P or S nodes are collapsed, clicking the other one will only result
      // in P and S to be in view with all there children nodes and hidden collapse and hidden from view
      toggleCollapse("P");
      toggleCollapse("S");
      await nextTick();

      expect(collapsedNodes.value.has("Q")).toBe(true); // Both parents collapsed

      const visibleLinks3 = filteredLinks.value;
      // P, S are visible (as roots/sources) but their outgoing links are hidden
      // P->Q hidden
      expect(
        visibleLinks3.some(
          (link) => getId(link.source) === "P" && getId(link.target) === "Q",
        ),
      ).toBe(false);
      // S->Q hidden
      expect(
        visibleLinks3.some(
          (link) => getId(link.source) === "S" && getId(link.target) === "Q",
        ),
      ).toBe(false);
      // Q->R hidden
      expect(
        visibleLinks3.some(
          (link) => getId(link.source) === "Q" && getId(link.target) === "R",
        ),
      ).toBe(false);
    });
  });
});
