# Render Adapters

The render components are small D3 adapters. They take prepared data and turn it into SVG updates.

Facts from the code:

- [Line.vue](../src/components/LineChart/Line.vue#L1-L63) binds one path string, sets stroke and dash animation, and updates the path with `watchEffect`.
- [Links.vue](../src/components/Sankey/Links.vue#L20-L159) joins link paths, applies stroke color and width, and animates between initial and final path generators.
- [Nodes.vue](../src/components/Sankey/Nodes.vue#L14-L77) joins node rectangles and updates `x`, `y`, `width`, and `height` from the Sankey layout.
- [Labels.vue](../src/components/Sankey/Labels.vue#L17-L85) places text using node geometry and text anchor logic.
- [Axis.vue](../src/components/common-ts/Axis.vue#L8-L50) calls D3 axis generators and applies axis styling helpers.
- [Tooltip.vue](../src/components/common-ts/Tooltip.vue#L10-L38) uses a band scale and a translated group to show the active date.

```mermaid
flowchart LR
  data[Prepared data] --> effect[watchEffect]
  effect --> join[D3 select / data / join]
  join --> svg[SVG elements]
```

What to teach:

- Render components should mutate SVG, not calculate chart rules.
- D3 joins belong here, not in the composables.
- Animations stay local to the adapter that owns the DOM element.
