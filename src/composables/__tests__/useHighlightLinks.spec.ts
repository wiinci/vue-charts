import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useHighlightLinks } from "../useHighlightLinks";

describe("useHighlightLinks", () => {
  // Mock nodes structure
  const createNode = (id: string) => ({ id, sourceLinks: [], targetLinks: [] });

  // Helper to connect nodes
  const connect = (source: any, target: any) => {
    const link = { source, target, value: 1 };
    source.sourceLinks.push(link);
    target.targetLinks.push(link);
    return link;
  };

  it("highlights direct connections", () => {
    const labelHoverId = ref<string>("");
    const collapsedNodes = ref(new Set<string>());

    const { shouldHighlight, processHoveredNode } = useHighlightLinks(labelHoverId, collapsedNodes);

    const nodeA = createNode("A");
    const nodeB = createNode("B");
    const linkAB = connect(nodeA, nodeB);

    // Hover A
    labelHoverId.value = "A";
    processHoveredNode(nodeA);

    expect(shouldHighlight(linkAB, { trueValue: true, falseValue: false })).toBe(true);

    // Hover B
    labelHoverId.value = "B";
    processHoveredNode(nodeB);
    expect(shouldHighlight(linkAB, { trueValue: true, falseValue: false })).toBe(true);

    // Hover C (unrelated)
    labelHoverId.value = "C";
    processHoveredNode(null);
    expect(shouldHighlight(linkAB, { trueValue: true, falseValue: false })).toBe(false);
  });

  it("propagates highlights upstream and downstream", () => {
    const labelHoverId = ref<string>("");
    const collapsedNodes = ref(new Set<string>());
    const { shouldHighlight, processHoveredNode } = useHighlightLinks(labelHoverId, collapsedNodes);

    // A -> B -> C
    const nodeA = createNode("A");
    const nodeB = createNode("B");
    const nodeC = createNode("C");
    const linkAB = connect(nodeA, nodeB);
    const linkBC = connect(nodeB, nodeC);

    // Hover B
    labelHoverId.value = "B";
    processHoveredNode(nodeB);

    // Should highlight upstream logic (highlight inputs)
    // The code:
    // if (sourceIds.has(link.target.id)) return true
    // sourceIds are upstream nodes.
    // If I hover B, collectTargets(B) adds A to sourceIds.
    // Logic: if sourceIds.has(link.target.id) -> if A is a sourceId.
    // linkAB: source=A, target=B.
    // sourceIds has A? Yes.
    // But wait, check logic: `sourceIds.value.has(link.target.id)` ??
    // If I hover B. A is in sourceIds.
    // linkAB target is B. sourceIds has B? No, B is the hovered node.
    // Logic seems to check if the link's *target* is in the set of *upstream sources*?
    // That sounds wrong. Usually upstream link means link.target == current (or something upstream).

    // Let's re-read the logic in useHighlightLinks.ts carefully.

    expect(shouldHighlight(linkAB, { trueValue: true, falseValue: false })).toBe(true);
    expect(shouldHighlight(linkBC, { trueValue: true, falseValue: false })).toBe(true);
  });

  it("respects collapsed nodes", () => {
    const labelHoverId = ref<string>("");
    const collapsedNodes = ref(new Set<string>());
    const { shouldHighlight, processHoveredNode } = useHighlightLinks(labelHoverId, collapsedNodes);

    // A -> B -> C
    const nodeA = createNode("A");
    const nodeB = createNode("B");
    const nodeC = createNode("C");
    const linkAB = connect(nodeA, nodeB);
    const linkBC = connect(nodeB, nodeC);

    // Collapse A
    collapsedNodes.value.add("A");

    // Hover A
    labelHoverId.value = "A";
    processHoveredNode(nodeA);

    // Logic: if !collapsedNodes.has(labelHoverId) -> highlight downstream.
    // Here A IS collapsed. So downstream (linkAB) might NOT be highlighted by the "downstream" logic?
    // But "Direct connection" logic: link.source.id === labelHoverId -> true.
    // So linkAB is highlighted because it directly connects to A.
    expect(shouldHighlight(linkAB, { trueValue: true, falseValue: false })).toBe(true);

    // What about B->C?
    // Since A is collapsed, we might expect propagation to stop?
    // traverse logic checks: if (!collapsedNodes.value.has(id)) traverse(...)
    // If I hover A. collectSources(A) -> traverses sourceLinks (A->B).
    // visit B. B is NOT collapsed. traverse(B). visit C.
    // So targetIds will contain B and C.

    // But shouldHighlight logic:
    // if (!collapsedNodes.value.has(labelHoverId.value)) { ... check downstream ... }
    // Here A is collapsed. So this block is SKIPPED.
    // So B->C (linkBC) should NOT be highlighted.

    expect(shouldHighlight(linkBC, { trueValue: true, falseValue: false })).toBe(false);
  });
});
