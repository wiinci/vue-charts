# Agentic Vue Charts: Skills & Architecture

This document defines the "Agentic" architecture for the `vue-charts` repository. It treats Vue components and composables as autonomous agents with distinct roles, ensuring separation of concerns, testability, and robustness suitable for LLM-generation workflows.

## Core Architecture: The Planner-Executor Pattern

Every complex visualization is composed of two primary agents:

1.  **The Planner (Composable):** Pure logic. Accepts environment state (props) and outputs a plan (layout data).
2.  **The Executor (Component):** Pure action. Accepts a plan and manipulates the physical world (DOM) using tools (D3).

---

## Skill: Chart Planning (The Planner)

**Role:** `src/composables/use*.ts`
**Goal:** Calculate geometry and layout without touching the DOM.

### Capabilities

- **Data Ingestion:** Accepts raw data and configuration via `Props`.
- **Simulation:** Runs D3 layouts (Sankey, Force, Tree) in a virtual context.
- **Output Generation:** Returns deeply typed arrays of Nodes and Links with `x, y, width, height`.

### Rules

1.  **No DOM Touch:** Never import `d3-selection` or `d3-transition` here.
2.  **Strict Typing:** Define interfaces for `Node` and `Link` that extend default D3 types but add required visualization properties.
3.  **Idempotence:** Given the same props, always return the same calculated layout.
4.  **Reactivity:** Use `computed` for derived state and `ref` + `watchEffect` only when the D3 algorithm has internal state (like simulations).

### Example Template

```typescript
export function useChartPlanner(props: ChartProps) {
	// 1. Perception
	const dimensions = computed(() => ({ w: props.width, h: props.height }))

	// 2. Reasoning (The Algorithm)
	const layout = computed(() => {
		const generator = d3.layout()
		return generator(props.data)
	})

	// 3. Plan Output
	return { nodes: layout.nodes, links: layout.links }
}
```

---

## Skill: DOM Execution (The Executor)

**Role:** `src/components/**/Nodes.vue`, `src/components/**/Links.vue`
**Goal:** Reconcile the "Plan" with the "Reality" (DOM) using the Enter-Update-Exit pattern.

### Capabilities

- **Tool Use:** Exclusive access to `d3-selection` and `d3-transition`.
- **Object Constancy:** Managing DOM identity using Data Keys.
- **Transition Management:** Handling the timing of entrance and exit animations.

### Rules

1.  **Object Constancy is Law:** Always provide a key function to `.data()`.
    - _Good:_ `.data(props.nodes, d => d.id)`
    - _Bad:_ `.data(props.nodes)` (Will cause state hallucination)
2.  **Scoped Selection:** operate only within a `ref` (e.g., `svgRef`). Never select `body` or global classes.
3.  **Enter-Update-Exit:**
    - `join(enter => ..., update => ..., exit => ...)`
    - Use `.call()` on transitions to keep code readable.

### Example Template

```typescript
watchEffect(() => {
  if (!root.value) return; // Wait for world

  select(root.value).selectAll('.agent')
    .data(props.plan, d => d.id) // Identify
    .join(
      enter => enter.append('rect').attr('opacity', 0)..., // Birth
      update => update.transition()..., // Evolution
      exit => exit.transition().attr('opacity', 0).remove() // Death
    );
});
```

---

## Skill: Interaction Handling (The Observer)

**Role:** `src/composables/useInteraction.ts` (or similar)
**Goal:** Detect user intent and modify the environment state.

### Capabilities

- **Event Listening:** `click`, `mouseover`, `drag`.
- **Signal Broadcasting:** `emit` events to parent or modify shared `ref` state.

### Rules

1.  **Inverse Data Flow:** Do not modify the DOM directly on hover. Update a reactive `hoveredId` and let the **Executor** update the view.
2.  **Debouncing:** For heavy interactions (brushing, zooming), debounce signals to prevent Planner overload.

---

## Skill: Script Server & Tooling

**Role:** `tools/*`
**Goal:** Automate the generation and validation of agents.

### Capabilities

- **Type Generation:** Ensure strict contracts between Planners and Executors.
- **Scaffolding:** Scripts to create new Chart Agents following this `SKILLS.md` structure.

```bash
# Example usage (Standardized workflow)
npm run generate:agent --name="Heatmap" --type="cartesian"
```
