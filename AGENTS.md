## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage label names without overrides. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.

## Project map

- `src/game.js` owns the runtime orchestration: boot, the frame loop, camera, canvas drawing, input routing, HUD wiring, and turning simulation events into presentation, audio, notices, and saved records.
- `src/data/` owns authored content as pure data: chapters (`chapters.js`) and character stats (`characters.js`). Builders return fresh records; nothing here touches runtime state.
- `src/sim/` owns the fixed-step simulation: collision (`physics.js`), world state and chain scoring (`world.js`), damage and respawn (`damage.js`), the player controller, hostiles, projectiles, level mechanics, and warden encounters. `sim.js` is the facade (`NiniYuanSim.step`). The simulation is DOM-free, viewport-free, and deterministic, and reports everything presentation needs as events on `world.events`.
- `styles.css` owns DOM layout, menu/panel presentation, responsive behavior, and CSS motion.
- `src/core/` owns persistent storage, audio, input-state boundaries, pure gameplay rules, meta-progression rules, and fixed-step scheduling.
- `src/core/progression.js` owns achievement predicates, trial-medal thresholds, and chain math as pure functions of a sanitized save plus chapter metadata.
- `src/render/` owns optional render helpers loaded before `src/game.js`.
- `src/render/camera.js` owns presentation framing: normalized zoom across viewports, the platform-anchor dead zone, render scale, and the culling rectangle.
- `src/render/scenery.js` (with `scene-specs.js`, `motifs.js`, and `art.js`) owns chapter backdrops. Backdrops are painted once per chapter and viewport; each frame only blits baked layers at whole device pixels, so per-frame cost does not grow with art detail.
- `src/render/atlas-cache.js` keeps display-ready copies of the painted protagonist atlases (reduced to on-screen size, night-graded, with a moonlight rim silhouette and per-cell foot baselines); `src/render/character-cloth.js` adds spring-driven hem motion by drawing each frame as horizontal bands. The authored paintings stay the source of truth (ADR 0002).
- Browser tests observe protagonist draws through `window.NiniYuanDiagnostics.onCharacterDraw`, never by sniffing `drawImage` sources.
- `src/render/terrain.js` owns platforms, hazards, and springs; `src/render/props.js` owns pickups, goals, portals, wind, projectiles, and the phase tide; `src/render/effects.js` owns pooled particles, float texts, and post layers. All three are stateless with respect to gameplay, and the drawn walkable top of every platform sits exactly on its collision edge.
- `src/render/creature-material.js` paints chapter creatures as beings from Chinese myth (Jade Toad, Huodou, Lantern Wraith) and owns their in-game names (`NAMES`).
- `src/render/warden.js` owns stateless Canvas drawing for the mythic wardens (Zhulong, Ao, Kun), hostile projectiles, sentries, warders, lanterns, and star marrow. Every warden keeps the same readable signals: a weak point that swells on telegraph and blazes open on recovery, a pale hit wash, and cracks at low health. Encounter state and collision stay in `src/sim/`.
- `src/render/plaques.js` introduces each creature and fixture once per session with a Chinese name seal and a four-character hint. Every name and hint is runtime copy, so run `npm run build:fonts` after changing the catalogue.
- `tests/unit/` covers pure modules, `tests/render/` covers render contracts against recording canvases (`tests/helpers/canvas.js`), `tests/sim/` drives the headless simulation with scripted input, `tests/content/` validates authored chapter data, and `tests/browser-smoke.js` owns the cross-viewport Playwright smoke path. Remaining interface and release guards live in adjacent `tests/*.js` files.

## Verification

- Run `npm test` before handing off behavior, UI, save, PWA, or release changes.
- Run `node tests/browser-smoke.js` after layout, canvas rendering, viewport, or asset-loading changes.
- Run `npm run build:android` before Android release work; if local Java/Android tooling is unavailable, record the exact blocker and rely on the Android CI workflow only after it passes.
- Run `npm run build:fonts` after adding user-visible Chinese copy, then record the printed digests in `assets/fonts/NOTICE.md`. The typography guard fails when a runtime glyph is missing from either subset.

## Boundaries and large-file ownership

- Treat `src/game.js`, `styles.css`, and `tests/browser-smoke.js` as large-file hotspots. Keep edits localized, prefer existing helper modules for new reusable behavior, and do not mix gameplay, layout, and release metadata changes unless the release scope requires it.
- If a hotspot must grow, document the behavioral boundary and add a focused regression guard in the same change.
- Keep gameplay key capture behind the `play` mode and editable/control-target gate in `src/core/input-state.js`; every menu, modal, visibility, and focus transition must clear gameplay held keys, pressed edges, and pointer references together. Mapped physical keys already down at a transition stay suppressed until their matching `keyup`.
- Keep collection rating, ammunition caps, terminal-outcome precedence, grounded spawn math, fixed-step overload policy, achievement predicates, trial-medal thresholds, and chain math in their pure `src/core/` helpers so recurring timing and state bugs remain directly testable.
- Chain rewards may only add star dew. The collection rating reads `player.collectedValue`, which takes the authored pickup value and nothing else.
- Gameplay entity simulation must not read `view.w`, `view.h`, or `view.dpr`. Ranges, trigger distances, and cull radii are world-space constants, so a chapter plays identically on a phone and a wide desktop. Camera framing, rendering, and HUD layout may read `view` freely. `tests/sim/boundaries.test.js` enforces this for `src/sim/` and `src/data/`, together with determinism (no `Math.random`) and DOM independence.
- New simulation behavior belongs in `src/sim/` with a headless test in `tests/sim/`; `src/game.js` only translates simulation events into presentation.
- Assist scales the delivered frame, never the fixed step, and an assisted run never writes best times or trial medals.
- Do not reintroduce per-release version allow-lists in tests. Assert a release floor through `tests/helpers/release.js` instead.
- Do not introduce alternate triage labels, external PR triage, or new domain vocabulary that conflicts with `CONTEXT.md` or ADRs.
