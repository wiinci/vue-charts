# vue-charts — Codebase Map

Folder-level overview (depth 2). 64 tracked files; single Vite SPA, no sub-apps.

| Path | What lives there |
|---|---|
| `src/components/Sankey/` | Sankey chart: `Sankey.vue` shell (props → layout → FSM), `Links.vue` / `Nodes.vue` / `Labels.vue` DOM executors, `Readme.md` with full props table |
| `src/components/LineChart/` | `LineChart.vue` shell (CSV parse → scales → axes/tooltip/voronoi), `Line.vue` path renderer |
| `src/components/common-ts/` | Shared chart primitives: `Chart.vue` (svg shell + margins), `Axis.vue`, `Tooltip.vue` (red vertical rule), `Voronoi.vue` (pointer hit-testing overlay), `LineGradient.vue` |
| `src/composables/` | Planners (no DOM): `useNodesAndLinks` (d3-sankey layout), `useLineChart` (scales/path), `useCollapsed`, `useHighlightLinks`, `useInteractionStateMachine` (hover/drag FSM), `useQuadtree` (spatial index); `sankeyModel.ts` / `sankeyTraversal.ts` helpers |
| `src/composables/__tests__/` | 6 Vitest specs, 24 tests (one per composable) |
| `src/utils/` | Axis/tick/format helpers: `smartTicks`, `xAxisPatterns`, `yAxisPatterns`, `formatTime`, `generateTransition`, `optimizeSvgPath`, `index.ts` barrel |
| `src/data/` | Static datasets: `edges.json`, `edges2.json`, `tables.json` (Sankey; App uses `edges2.json`), `aapl.csv` (line chart, imported `?raw`) |
| `src/assets/` | `constants.ts` — colors, durations, shared config |
| `src/` root | `App.vue` (mounts Sankey + deferred LineChart under Suspense), `main.ts`, `vite-env.d.ts` |
| `docs/` | Architecture one-pagers — index in `docs/README.md` (architecture-overview, chart-shells, composable-planning, sankey-data-boundaries, interaction-state, render-adapters, shared-utilities, testing-contracts) |
| `.github/prompts/` | `guidelines.prompt.md` (clean-code review rules), `vue.prompt.md` |
| `.github/workflows/` | `ci.yml` (npm ci → test → typecheck → build on Node 20), `codeql-analysis.yml` |
| repo root | `index.html` (Vite entry), `vite.config.ts` (`@`→`src` alias, happy-dom test env, manual chunks d3/charts), `tsconfig.json` (strict), `SKILLS.md` (Planner–Executor agent rules), `README.md`, `LICENSE` |
