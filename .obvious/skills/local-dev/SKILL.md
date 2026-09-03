---
name: local-dev
---

# Local Dev — vue-charts

Durable record of the 2026-09-03 onboarding run on sandbox `cmp_IyrqQ9RG`.
Everything below was executed and verified in that session.

## Bring-up

1. `npm ci` — canonical install (`package-lock.json`; CI does the same).
   If `npm ci` fails with `EACCES` on `node_modules/.bin`, the provisioning
   left `node_modules` root-owned: `sudo rm -rf node_modules && npm ci`.
2. No services to start — no database, no Redis, no Docker Compose, no env vars.
3. `npm run dev` — Vite prints `Local: http://localhost:5173/`; parse the port
   from that line (none is configured). Verify with `curl -s -o /dev/null -w '%{http_code}' http://localhost:<port>/` → 200.

## Verify (all green on 2026-09-03)

- `npm run typecheck` — exit 0
- `npm test -- --run` — 6 files / 24 tests passed (~1s)
- `npm run build` — 568 modules, `dist/` emitted (~2s)
- No lint script exists; typecheck + tests + build are the quality gates (CI runs exactly these three).

## Primary user flows (browser e2e)

Playwright + headless Chromium were installed under `/tmp/pw` (npm project with
`playwright`, browser at `~/.cache/ms-playwright/chromium_headless_shell-1234`);
scripts `/tmp/pw/verify*.mjs`. Evidence screenshots in
`/home/user/onboarding-evidence/`.

1. **Initial render** — after `GET /`, wait for `g.links path` (41 links),
   then ~3s for `requestIdleCallback` to mount the LineChart: expect 2 `svg`
   elements, 49 labels, 44 line-chart paths. Console must stay clean.
2. **Sankey label hover → link highlight** — labels have `pointer-events: none`;
   the chart root does quadtree hit-testing (60px radius). Move the mouse to a
   label's bounding-box center; related links gain class `raise` and stroke
   `#1F1D3D` (5 links highlighted for node `n9::n3` in the run).
3. **Sankey node click → collapse** — click at the same point: `toggleCollapse`
   removes the node's links (41 → 36 rendered paths).
4. **Line chart hover → tooltip rule** — sweep the mouse over the second
   `.chart`; `g.tooltip` (a red `M0 0 V390` rule, not text) translates to the
   nearest point (observed 0 → 237 → 721 px).

## Known traps

- Do not `locator.hover()` a Sankey label `text` — times out (pointer-events).
- `bun.lock` (untracked) is a provisioning artifact; never commit it.
- Unit tests run in happy-dom; no jsdom needed.
- `@` alias → `src/` (vite.config.ts + tsconfig paths).
