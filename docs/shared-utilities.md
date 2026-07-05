# Shared Utilities

The utility folder collects small helpers that would otherwise get copied into chart components.

Facts from the code:

- [utils/index.ts](../src/utils/index.ts#L1-L8) exports `formatTime`, `generateTransition`, `optimizeSvgPath`, `smartTicks`, `xAxisPatterns`, and `yAxisPatterns`.
- [formatTime.ts](../src/utils/formatTime.ts#L1-L17) chooses a display format from UTC date granularity.
- [smartTicks.ts](../src/utils/smartTicks.ts#L1-L16) picks a tick count from the scale maximum.
- [generateTransition.ts](../src/utils/generateTransition.ts#L1-L12) reads `window.matchMedia('(prefers-reduced-motion: reduce)')` at module scope and shortens transitions when reduced motion is requested.
- [xAxisPatterns.ts](../src/utils/xAxisPatterns.ts#L1-L10) and [yAxisPatterns.ts](../src/utils/yAxisPatterns.ts#L1-L15) apply consistent axis styling.
- [optimizeSvgPath.ts](../src/utils/optimizeSvgPath.ts#L1-L12) rounds numeric SVG path segments to a fixed number of decimals.

Why this helps:

- Small helpers stay reusable across charts.
- Common rules stay consistent.
- Component files stay shorter and easier to scan.
