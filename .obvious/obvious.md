# vue-charts — Agent Guide

Interactive chart demo app: a Sankey diagram (data-lineage style) plus an AAPL
line chart, built with Vue 3.5 + D3.js. Single-page app, static data files,
no backend, no database, no external services, no env vars required.

## Stack

| Layer | Tool | Version in lockfile |
|---|---|---|
| UI framework | Vue (`<script setup>`, defineModel, propsDestructure) | 3.5.14 |
| Build + dev server | Vite | 6.3.5 |
| Language | TypeScript (strict, `noUnusedLocals`) | 5.8.3 |
| Charts | D3 (d3-sankey, d3-delaunay, d3-scale, d3-selection…) | 7.8.5 |
| Unit tests | Vitest + happy-dom | 4.0.18 |
| Typecheck | vue-tsc (noEmit) | 3.3.6 |
| Runtime | Node.js (CI pins major 20) | 20.x |
| Package manager | npm — `package-lock.json` is canonical; CI runs `npm ci` | 10.x |

## Commands

| Task | Command | Notes |
|---|---|---|
| Install | `npm ci` | clean install from lockfile |
| Dev server | `npm run dev` | Vite, prints `Local: http://localhost:5173/` (parse the port from output; no port is configured) |
| Unit tests | `npm test -- --run` | single run; plain `npm test` watches |
| Typecheck | `npm run typecheck` | `vue-tsc --noEmit` |
| Build | `npm run build` | outputs `dist/` with manual chunks `d3` + `charts` |
| Preview build | `npm run preview` | serves `dist/` |

No lint script is configured — TODO(confirm) if one is added.

## Env vars

None required. No `.env`, no secrets. Only `NODE_ENV` is read (vite.config.ts `mode`).

## Codebase map

See [codebase-map.md](./codebase-map.md). Architecture: Planner–Executor pattern —
composables (`src/composables/`) compute layout without touching the DOM; components
(`src/components/`) execute DOM updates via `d3-selection`/`d3-transition`.
Interaction uses a finite state machine (`useInteractionStateMachine`), quadtree
node hit-testing (60px radius), and Voronoi overlays for the line chart.

Key guidance docs: `SKILLS.md` (agent architecture rules), `docs/README.md`
(topic index), `.github/prompts/*.prompt.md` (code-review guidelines).

## Local Verification Summary

Onboarding run 2026-09-03, sandbox `cmp_IyrqQ9RG`, Node v20.20.2:

- [x] `npm ci` — clean install as user (root-owned pre-provisioned `node_modules` removed first)
- [x] `npm run typecheck` — exit 0, no errors
- [x] `npm test -- --run` — 6 files, 24/24 tests passed
- [x] `npm run build` — 568 modules, `dist/` emitted
- [x] `npm run dev` — Vite 6.3.5 ready on port 5173; `GET /` returns HTTP 200
- [x] Browser e2e (Playwright + headless Chromium): page loads with 41 Sankey link
      paths, 49 labels, 2 SVGs (Sankey + LineChart); zero console errors/warnings,
      zero page errors
- [x] Primary flow 1 — Sankey label hover: 5 related links gain `raise` class with
      highlight stroke `#1F1D3D` (end-to-end link highlight)
- [x] Primary flow 2 — Sankey node click: collapse toggle drops rendered links 41 → 36
- [x] Primary flow 3 — Line chart hover: red tooltip rule (`g.tooltip`) translate
      moves 0 → 237 → 721 px tracking the nearest data point
- Screenshots: `/home/user/onboarding-evidence/*.png` on the sandbox (01-initial-load,
  02-label-hover-highlight, 03-linechart-hover-tooltip, 04-node-click-collapse)

## Sandbox snapshot

- Computer: `cmp_IyrqQ9RG` (wiinci/vue-charts), template `5z8esp22pvw939t9pfnv:default`
- Captured live session (snapshot id): `i9vx7ok2mm897wl1sun5t`
- Built at: 2026-09-03T15:35:46.761Z
- State at capture: dev server running on port 5173, `node_modules` installed via
  `npm ci` as `user`, Playwright + headless Chromium installed under `/tmp/pw`,
  Vite/TypeScript toolchain verified green

## Gotchas

- Provisioning may leave `node_modules` root-owned → `npm ci` fails with EACCES.
  Fix: `sudo rm -rf node_modules && npm ci`. Passwordless sudo is available.
- An untracked `bun.lock` may appear from provisioning; npm is canonical — do not
  stage or commit it.
- The app renders the LineChart only after `requestIdleCallback` (~250ms timeout);
  wait 2–3s in e2e before asserting on the second chart.
- Sankey hover is chart-level quadtree hit-testing near labels; labels have
  `pointer-events: none`, so `locator.hover()` on label text times out — move the
  mouse to label coordinates instead.
- The LineChart "tooltip" is a red vertical rule whose `transform` changes on
  hover, not a text tooltip.
