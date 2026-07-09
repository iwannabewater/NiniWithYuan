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
- `src/core/` owns persistent storage and audio helpers.
- `src/render/` owns optional render helpers loaded before `src/game.js`.
- `tests/browser-smoke.js` owns the cross-viewport Playwright smoke path; narrow regression guards live in adjacent `tests/*.js` files.

## Verification

- Run `npm test` before handing off behavior, UI, save, PWA, or release changes.
- Run `node tests/browser-smoke.js` after layout, canvas rendering, viewport, or asset-loading changes.
- Run `npm run build:android` before Android release work; if local Java/Android tooling is unavailable, record the exact blocker and rely on the Android CI workflow only after it passes.

## Boundaries and large-file ownership

- Treat `src/game.js`, `styles.css`, and `tests/browser-smoke.js` as large-file hotspots. Keep edits localized, prefer existing helper modules for new reusable behavior, and do not mix gameplay, layout, and release metadata changes unless the release scope requires it.
- If a hotspot must grow, document the behavioral boundary and add a focused regression guard in the same change.
- Do not introduce alternate triage labels, external PR triage, or new domain vocabulary that conflicts with `CONTEXT.md` or ADRs.
