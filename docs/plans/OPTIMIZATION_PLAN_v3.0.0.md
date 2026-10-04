# v3.0.0 星河长卷 / Starriver Scroll Release Plan

## Status

This document records the implemented v3.0.0 scope on `feat/v3.0.0-starriver-scroll`. It has not been published; a release still requires Android CI on the release commit, device review, and live web readback.

## Scope

1. Architecture: a headless, deterministic simulation in `src/sim/` driven by authored data in `src/data/`, reporting everything presentation needs as events. `src/game.js` translates events into presentation.
2. Render pipeline: baked backdrops blitted at whole device pixels (ADR 0004), stateless terrain, props, and pooled effects, normalized camera framing, and a device-pixel cap near 1440p.
3. Protagonists: display caches with night grade, opaque-core rim, measured foot baselines, and banded hem springs over the painted atlases (ADR 0005).
4. Creatures and wardens from Chinese myth, with the readable signals of v2.1.0 preserved, and name seals for each creature and fixture.
5. Content: World 4 with magpie bridges, updrafts, and the 天狗 warden; two new records; save migration for cleared chapter 15.
6. Interface: silk panels, seal eyebrows, clean chapter titles; a four-world chapter atlas that fits 1280 by 720.
7. Audio: plucked pentatonic pickup phrases and World 4 cues.

## Preserved Invariants

- Fixed simulation remains `1 / 120` with the existing overload policy.
- Character movement tuning, save schema 4, input arbitration, collection rating, chain rules, and assist record rules remain unchanged.
- Simulation code never reads the viewport and never uses `Math.random`; `tests/sim/boundaries.test.js` enforces this.
- Render modules never write gameplay state.

## Verification

- `npm test` (units, simulation, content and reachability, render contracts, interface and release guards, real-browser suites, browser smoke).
- `npm run build:fonts` after runtime copy changes, with digests recorded in `assets/fonts/NOTICE.md`.
- `npm run build:android` and `scripts/inspect-android.sh` locally.
- Headless Chromium frame cost compared against the v2.3.0 baseline.
