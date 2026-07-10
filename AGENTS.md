## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage label names without overrides. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.

## Project map

- `src/game.js` owns the Canvas runtime: level data, physics, combat, camera, canvas drawing, input routing, and HUD state wiring.
- `styles.css` owns DOM layout, menu/panel presentation, responsive behavior, and CSS motion.
- `src/core/` owns persistent storage, audio, input-state boundaries, pure gameplay rules, and fixed-step scheduling.
- `src/render/` owns optional render helpers loaded before `src/game.js`.
- `src/render/playfield-material.js` owns stateless Canvas material drawing; collision geometry, gameplay state, and render ordering remain in `src/game.js`.
- `tests/browser-smoke.js` owns the cross-viewport Playwright smoke path; narrow regression guards live in adjacent `tests/*.js` files.

## Verification

- Run `npm test` before handing off behavior, UI, save, PWA, or release changes.
- Run `node tests/browser-smoke.js` after layout, canvas rendering, viewport, or asset-loading changes.
- Run `npm run build:android` before Android release work; if local Java/Android tooling is unavailable, record the exact blocker and rely on the Android CI workflow only after it passes.

## Boundaries and large-file ownership

- Treat `src/game.js`, `styles.css`, and `tests/browser-smoke.js` as large-file hotspots. Keep edits localized, prefer existing helper modules for new reusable behavior, and do not mix gameplay, layout, and release metadata changes unless the release scope requires it.
- If a hotspot must grow, document the behavioral boundary and add a focused regression guard in the same change.
- Keep gameplay key capture behind the `play` mode and editable/control-target gate in `src/core/input-state.js`; every menu, modal, visibility, and focus transition must clear gameplay held keys, pressed edges, and pointer references together. Mapped physical keys already down at a transition stay suppressed until their matching `keyup`.
- Keep collection rating, ammunition caps, terminal-outcome precedence, grounded spawn math, and fixed-step overload policy in their pure `src/core/` helpers so recurring timing and state bugs remain directly testable.
- Do not introduce alternate triage labels, external PR triage, or new domain vocabulary that conflicts with `CONTEXT.md` or ADRs.
