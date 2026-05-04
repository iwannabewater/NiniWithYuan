# v1.5.0 Game-Feel and Sound-Design Polish Pass

Date: 2026-05-04
Repository: `iwannabewater/NiniWithYuan`
Baseline: `v1.4.0` (commit `7b46470`)
Status: approved for implementation planning

## Objective

Version `1.5.0` is the first release of the v1.5.x quality arc. It is a moment-to-moment polish pass: hit-stop, dash anticipation, landing puff, screen-shake mixer, BGM autoplay-retry, respawn fade, camera lookahead, and a 16-cue Web Audio sound-design layer that replaces scattered `beep()` calls with a named cue table.

The release does not change content, save schema, character physics tuning (jump height, gravity, max-fall, dash speed/distance, glide duration), input bindings, world geometry, or visual identity. Every change is surgical: two new files under `src/render/`, one extension to `src/core/audio.js`, and ~25 localized edits in `src/game.js`.

The release deliberately excludes performance optimization, accessibility / assist mode, and journal / codex work — those are scoped into v1.5.1, v1.5.2, and v1.5.3 respectively, each with its own design pass.

## Release Scope

- Add 9 game-feel polish items to `src/game.js`: 7 new behaviors (hit-stop, dash anticipation, landing puff, screen-shake mixer, BGM autoplay-retry, respawn fade, camera lookahead) plus 2 regression-pin audits (variable-jump cut, coyote / jump buffer).
- Add a 16-entry Web Audio cue table to `src/core/audio.js`; replace ad-hoc `beep(freq, dur)` call sites with semantic `audioBus.cue(name)` calls. Retain the low-level `beep()` helper for backwards-compatibility with existing tests.
- Add two new modules: `src/render/game-feel.js` and `src/render/respawn-veil.js`.
- Add one new regression file: `tests/gamefeel-v1_5_0.js`.
- Update existing tests for version pin loosening and BGM retry attach.
- Bump web `package.json`, `package-lock.json`, service worker cache key, Android `versionCode`, Android `versionName`, and the documentation set.
- Maintain `SAVE_SCHEMA_VERSION = 2`. Saves are not migrated.

## Non-Goals

- No new runtime dependencies. No new dev dependencies. No bundler. Vanilla JS, file-loadable, offline-first identity preserved.
- No accessibility / assist-mode work (deferred to v1.5.2).
- No viewport culling, particle pooling, debounced persistence, or other performance optimization (deferred to v1.5.1).
- No codex, journal, death counter, surprise counter, or completion celebration (deferred to v1.5.3).
- No content additions: no new chapters, enemies, hazards, pickups, or worlds.
- No physics constant changes. Jump height, gravity, max-fall, dash speed, dash distance, glide duration, coyote 0.12 s, jump buffer 0.14 s, ammo regen 1.6 s, portal cooldown 0.34 s, phase period 3.2 s — all unchanged. Items 4 and 5 verify these via regression pin only.
- No save schema bump.
- No Android native behavior change beyond version metadata.

## Architecture and Module Layout

The strict envelope keeps the existing pattern: small vanilla-JS modules loaded by `<script defer>` tags before `game.js`, registered on `window.NiniYuan*`, with a `module.exports` tail for Node-side tests.

### New modules

- `src/render/game-feel.js` — exports `window.NiniYuanGameFeel` with:
  - `requestHitstop(ms)` — schedule a freeze; take-max not sum; clamp to 120 ms cap; no-op under reduced motion.
  - `tickHitstop(dt)` — decrement timer; return `true` if currently frozen, `false` otherwise.
  - `resetHitstop()` — zero the timer immediately. Used by lifecycle resets (level start, respawn, visibility change).
  - `cameraLookaheadOffset(player, view, dt, camera)` — mutate `camera.lookX/lookY` smoothly; return the `{x, y}` offset to add to camera target.
  - `cameraLookaheadReset(camera)` — zero `lookX/lookY` immediately, no smoothing.
  - `clampShake(currentShake, eventShake, isMobileLandscape, isReducedMotion)` — return `max(currentShake, eventShake × multiplier)`.
  - `landingPuff(spawnSparkFn, x, y, intensity, fxOn)` — emit dust ivory sparks via the existing `spawnSpark` helper.
- `src/render/respawn-veil.js` — exports `window.NiniYuanRespawnVeil` with:
  - `flash(durationMs = 180)` — show a single DOM ink-veil overlay; CSS-keyframed fade; remove on `animationend`. Idempotent: a second call within the fade restarts the animation via the same reflow trick used by `pulseHudPill` (game.js:2405, hud.js:117).

### Extended modules

- `src/core/audio.js` — `createAudioBus()` gains:
  - `cue(name)` — look up `name` in the 16-entry `CUE_TABLE`; build short-lived Web Audio node graph (osc → optional biquad → gain envelope → destination); self-stops; volume = 0 short-circuits; matches existing `beep()` capability fallback.
  - `armAutoplayRetry()` — register `pointerdown` and `keydown` listeners on `window`; on first interaction with `bgmRequested && bgm.paused && !document.hidden && bgmGain() > 0`, call `playBgm()` again; remove listeners on success. Idempotent via an instance-local `armed` flag (the bus instance returned from `createAudioBus()` owns the flag, not the module).
- The existing `beep(freq, duration)` helper is retained for any test that calls it directly.

### `src/game.js` call-site changes

All edits are localized swaps; no restructuring. Concrete sites:

- `loop(now)` (line 2654): add hit-stop tick before the accumulator loop; if frozen, render and return without draining the accumulator.
- `update(dt)` (line 839): add `wasOnGround = player.onGround` and `player.prevVy = player.vy` before `updatePlayer(dt)`; after `updatePlayer(dt)`, fire `landingPuff` when `player.onGround && !wasOnGround && player.prevVy > 380`.
- `updatePlayer(dt)` Yuan dash branch (lines 994–1010): `requestHitstop(45)` immediately before `player.vx = player.dashDir * YUAN_DASH_SPEED`; replace the existing `camera.shake = Math.max(camera.shake, 7)` with a `clampShake(...)` route; replace `beep(...)` with `audioBus.cue("dash")`.
- Stomp branch (lines 1062–1068): `requestHitstop(50)`; replace `beep` with `audioBus.cue("stomp")`.
- Projectile-hits-enemy branch (lines 1342–1352): `requestHitstop(35)`; cue `"hit_take"` and (if `e.alive === false` after damage) cue at higher coin reward.
- Crystal break in dash (lines 1084–1095): `requestHitstop(35)`; cue `"break_crystal"`; route shake through `clampShake`.
- `hurt()` (lines 1471–1496): `requestHitstop(70)` for normal hurt; cue `"hit_super"` for the `superInvuln` flash branch and `"hit_take"` for the damaging branch; route shakes through `clampShake`.
- All other `beep(freq, dur)` sites in `updatePlayer`, `updatePortals`, `applyPowerup`, `updatePickups`, `shootProjectile`, `completeLevel` — replace with semantic `audioBus.cue(name)` per the cue table.
- `updateCamera()` (lines 1538–1544): incorporate `cameraLookaheadOffset` into `targetX` and `targetY` before the existing exponential lerp; the existing `clamp(0, level − view)` remains the final pass.
- `updatePortals()` (lines 1223–1246): after the position swap and before `refreshGroundedState()`, call `cameraLookaheadReset(camera)` to prevent lurch.
- `respawn()` (lines 1498–1508): wrap teleport in `RespawnVeil.flash(180)`; call `GameFeel.cameraLookaheadReset(camera)`; call `GameFeel.resetHitstop()`.
- `handleVisibilityChange()` (line 2639): call `GameFeel.resetHitstop()`; remove any in-flight respawn veil; zero `camera.lookX/lookY`.
- `init()` (line 2673): call `audioBus.armAutoplayRetry()` after `audioBus.setBgmSource(...)`.
- `resize()` (line 747): cache `view.isMobileLandscape = matchMedia("(max-width: 900px) and (orientation: landscape)").matches` and `view.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches`. When `matchMedia` is unavailable, both default to `false`.
- `startLevel()` (line 765): initialize `player.prevVy = 0`, `player.dashFreeze = 0`; reset `camera.lookX = 0`, `camera.lookY = 0`; call `GameFeel.resetHitstop()`.

### File layout

```
src/
├── core/
│   ├── audio.js          extended: cue, armAutoplayRetry
│   └── storage.js        unchanged
├── render/
│   ├── cursor-trail.js   unchanged
│   ├── easter-eggs.js    unchanged
│   ├── game-feel.js      NEW
│   ├── hud.js            unchanged
│   └── respawn-veil.js   NEW
└── game.js               ~25 surgical call-site edits

tests/
├── gamefeel-v1_5_0.js    NEW
├── audio-bgm.js          extended: armAutoplayRetry attach
└── run-all.js            extended: wire new file

index.html                +2 <script defer> tags before game.js
service-worker.js         CACHE bump; ASSETS additions
package.json              1.4.0 → 1.5.0
package-lock.json         1.4.0 → 1.5.0
android/.../AndroidManifest.xml      versionCode 10→11; versionName 1.5.0
docs/                     CHANGELOG, README, GDD, MOTION, DESIGN updates
docs/plans/               OPTIMIZATION_PLAN_v1.5.0.md (new)
docs/plans/README.md      +link
```

## Per-Item Design

Tuning values and call sites are concrete. Numbers were chosen to match SOTA references (Celeste, Hollow Knight, Dead Cells, Ori) but conservatively for a touch-first WebView.

### 1. Hit-stop / hitlag

- API: `requestHitstop(ms)` performs `hitstopRemaining = min(120, max(hitstopRemaining, ms))`. Take-max, never sum. Cap 120 ms.
- Loop integration: in `loop(now)`, after computing `frameDt`, decrement `hitstopRemaining` by `frameDt × 1000`. If `hitstopRemaining > 0` and `mode === "play"`, `render()`, schedule next frame, and return without draining the accumulator. The accumulator stays paused so post-freeze playback resumes from the same simulation cursor.
- Sites and durations:
  - Stomp (game.js:1062–1068): 50 ms.
  - Projectile-on-enemy hit (game.js:1342–1352): 35 ms.
  - `hurt()` damaging branch (game.js:1471–1496): 70 ms.
  - Crystal break in Yuan dash (game.js:1084–1095): 35 ms.
  - Yuan dash anticipation (game.js:994–1010): 45 ms (the dash freeze item).
- Reduced motion: `prefers-reduced-motion: reduce` causes `requestHitstop(...)` to no-op.

### 2. Dash freeze-frame

- Implementation: reuse hit-stop infrastructure. In the Yuan skill-pressed branch (game.js:994–1010), call `requestHitstop(45)` immediately before assigning `player.vx = player.dashDir * YUAN_DASH_SPEED`. The single frame of stillness before launch reads as anticipation.
- The `player.dashFreeze` field is informational only (no separate state machine); the actual freeze is driven by `hitstopRemaining`.
- Reduced motion: 0 ms (inherits from hit-stop).

### 3. Landing puff

- Trigger: in `update(dt)`, capture `wasOnGround = player.onGround` and `player.prevVy = player.vy` before `updatePlayer(dt)`. After `updatePlayer(dt)`, when `player.onGround === true && wasOnGround === false && player.prevVy > 380`, call `landingPuff`.
- Tuning: `intensity = clamp((prevVy − 380) / 800, 0.2, 1.0)`. Particle count: `Math.round(3 + intensity × 5)` (range 4–8). Color: `"#e7d8b5"` (dust ivory).
- Spawn helper: existing `spawnSpark(x, y, color, count)` from `src/game.js`.
- Reduced motion: not a strict gate. Already gated by `save.settings.fx`; the puff is tactile rather than motion-decorative.

### 4. Variable-jump audit

- Current behavior (game.js:1035): `if (inputs.jumpReleased && player.vy < -160) player.vy *= 0.56;`
- Decision: pin the current values via regression test. Do not change tuning unless the audit during implementation reveals a felt regression.
- Test asserts both literals `vy < -160` and `* 0.56` exist in `game.js` source.

### 5. Coyote and jump buffer audit

- Current behavior: `coyote = 0.12 s` and `jumpBuffer = 0.14 s` (game.js initialization in `startLevel` and `updatePlayer` decrement at line 933–934).
- Decision: pin via regression test. Verify buffer fires when `jumpPressed` precedes grounding by ≤ 0.14 s; verify coyote re-arms when player walks off a platform edge.
- Test asserts both literal values exist in source.

### 6. Screen-shake clamp

- API: `clampShake(currentShake, eventShake, isMobileLandscape, isReducedMotion)` returns `max(currentShake, eventShake × multiplier)`, where `multiplier = 0.30` if reduced motion, else `0.65` if mobile landscape, else `1.0`.
- Sites: every `camera.shake = N` and `camera.shake = Math.max(camera.shake, N)` in `src/game.js` routes through this helper. Confirmed 7 setter sites by grep (the per-frame decay at `updateCamera` line 1543 and the read sites at lines 1552/1553 are intentionally untouched):
  - game.js:1001 (Yuan dash, current value 7)
  - game.js:1047 (spring, current value 5)
  - game.js:1090 (crystal break, current value 11)
  - game.js:1241 (portal, current value 4)
  - game.js:1473 (super-hurt flash, current value 5)
  - game.js:1483 (hurt damaging, current value 13)
  - game.js:1507 (respawn, current value 9)
- `view.isMobileLandscape` and `view.reducedMotion` are cached in `resize()`.
- `matchMedia` unavailable: both default to `false`; clamp acts as a pass-through max.

### 7. BGM autoplay-retry

- API: `audioBus.armAutoplayRetry()`. Instance-local `armed` flag (owned by the bus instance returned from `createAudioBus()`) makes the call idempotent. Registers two listeners on `window`:
  - `window.addEventListener("pointerdown", retry, { passive: true })`
  - `window.addEventListener("keydown", retry, { passive: true })`
- The `{ once: true }` option is intentionally NOT used. The handler self-removes on success. This allows the case where the listener fires while the page is `document.hidden` to skip without losing the listener.
- Retry behavior: when fired, if `bgmRequested && bgm.paused && !document.hidden && bgmGain() > 0`, call `playBgm()` and, on the resulting promise resolution, remove both listeners and set `armed = false`.
- Edge: if `bgmRequested === false` (player has not yet entered gameplay), remove listeners and set `armed = false` — no point listening forever for a BGM that was never requested.
- Site: called in `init()` (game.js:2673) after `audioBus.setBgmSource(...)`.

### 8. Snappy respawn fade

- API: `RespawnVeil.flash(durationMs = 180)`.
  - Lazily insert a single `<div class="respawn-veil">` into `<main id="shell">` on first call.
  - CSS keyframe `@keyframes respawn-veil-flash`: 0% opacity 0 → 22% opacity 0.92 (40 ms in) → 55% opacity 0.92 (60 ms hold) → 100% opacity 0 (80 ms out).
  - Visual: full-screen night ramp `--c-night-1000` ink fill plus inner gold halo `radial-gradient(circle at 50% 55%, rgba(242,211,137,0.18), transparent 65%)`.
  - On `animationend`, remove the `.playing` class. Element is reused across respawns.
- Idempotency: a second `flash()` within the duration restarts the animation via `el.classList.remove("playing"); void el.offsetWidth; el.classList.add("playing")` (matches `pulseHudPill` pattern at hud.js:117).
- Site: `respawn()` (game.js:1498).
- Reduced motion: keyframe collapses to a single 40 ms total flash (`@media (prefers-reduced-motion: reduce)` shortens the keyframe).
- Z-index: between HUD and modal — concrete `--z-respawn-veil` value picked from `styles.css` at implementation time, slotted between the existing HUD `z-index` and modal `z-index`. The veil is visible during gameplay but a pause modal popping over a dying player still wins.

### 9. Camera lookahead

- State on `camera`: `lookX` and `lookY`, both initialized to 0 in `startLevel()`.
- API: `cameraLookaheadOffset(player, view, dt, camera)` mutates `camera.lookX/lookY` and returns `{x, y}`.
  - `camera.lookX = lerp(camera.lookX, sign(player.vx) × min(|player.vx|, 500) / 500, 1 − Math.pow(0.0035, dt))` — time-constant ≈ 220 ms.
  - `camera.lookY = lerp(camera.lookY, clamp(player.vy / 600, -0.4, 0.6), 1 − Math.pow(0.001, dt))` — slower vertical smoothing.
  - Returns `{ x: camera.lookX × MAX_LOOKAHEAD_X, y: camera.lookY × MAX_LOOKAHEAD_Y }`.
- Constants: `MAX_LOOKAHEAD_X = 56`, `MAX_LOOKAHEAD_Y = 30`.
- Site: `updateCamera()` (game.js:1538–1544): after computing `targetX` and `targetY`, add the offset, then keep the existing exponential lerp. The existing `clamp(0, max(0, levelW − viewW))` remains the final pass; lookahead never moves the camera outside level bounds.
- Reset sites:
  - `updatePortals()` (game.js:1223–1246) after teleport: `cameraLookaheadReset(camera)`.
  - `respawn()` (game.js:1498): `cameraLookaheadReset(camera)`.
  - `handleVisibilityChange()`: zero `lookX/lookY`.
- Reduced motion: `MAX_LOOKAHEAD_X = 0`, `MAX_LOOKAHEAD_Y = 0`. Smoothing still runs but contributes nothing visible.

### 10. Web Audio cue table

The 16 cues replace scattered `beep(freq, dur)` calls with semantic names. The cue spec format:

```js
{
  wave: "triangle" | "sine" | "square",
  freq: number | [startHz, endHz],
  attack: number,    // ms
  release: number,   // ms
  gain: number,      // 0..1 multiplier on top of (volume / 1000) baseline
  lowpass?: number,  // optional biquad lowpass cutoff Hz
  osc2?: { detune: number, mix: number }  // optional second oscillator
}
```

| Cue | Wave | Freq (Hz) | Attack/Release (ms) | Special |
|---|---|---|---|---|
| `jump` | triangle | 480 → 560 | 6 / 80 | — |
| `dash` | square | 280 → 160 | 4 / 140 | lowpass 1200 |
| `skill_ready` | sine | 640 → 820 | 10 / 140 | chime |
| `shoot_nini` | triangle | 860 → 920 | 4 / 50 | — |
| `shoot_yuan` | square | 520 → 440 | 4 / 60 | lowpass 2200 |
| `stomp` | square | 680 → 360 | 2 / 80 | lowpass 1400 |
| `hit_take` | triangle | 180 → 140 | 2 / 160 | — |
| `hit_super` | sine | 920 → 660 | 6 / 140 | — |
| `pickup_coin` | triangle | 720 → 860 | 4 / 55 | — |
| `pickup_gem` | sine | 920 → 1280 | 6 / 90 | osc2 +1200¢ mix 0.35 |
| `pickup_powerup` | triangle | 640 → 980 | 8 / 180 | — |
| `spring` | sine | 520 → 820 | 6 / 90 | — |
| `portal` | sine | 520 → 720 | 8 / 140 | osc2 +700¢ mix 0.40 |
| `break_crystal` | square | 300 → 220 | 2 / 90 | lowpass 1800 |
| `complete` | triangle | 820 → 1240 | 10 / 240 | — |
| `fail` | sine | 220 → 160 | 8 / 280 | — |

### Cue-to-call-site mapping

- `jump` — game.js:1033 (existing `beep(540, 0.045)`).
- `dash` — game.js:994–1010 Yuan dash branch.
- `shoot_nini` / `shoot_yuan` — game.js:1187 (existing branched `beep`).
- `stomp` — game.js:1068.
- `hit_take` — game.js:1485 (existing `beep(180, 0.08)`); also game.js:1342–1352 projectile hit.
- `hit_super` — game.js:1473 super-hurt branch.
- `pickup_coin` — game.js:1428 normal coin.
- `pickup_gem` — game.js:1428 gem branch.
- `pickup_powerup` — game.js:1468 (existing `beep(980, 0.075)` in `applyPowerup`).
- `spring` — game.js:1049.
- `portal` — game.js:1245.
- `break_crystal` — game.js:1090 Yuan dash crystal break.
- `complete` — game.js:1520 (existing `beep(980, 0.1)` in `completeLevel`).
- `fail` — `hurt()` death branch (new — currently no audio cue at line 1486–1496 death modal open).
- `skill_ready` — fired only when `cooling` flips true → false (skill becomes ready); the inverse flip (cooldown started) does not fire a cue. Hooked into `updateHud()` cooling-state flip detection (game.js:2414–2417). Adds one new conditional next to the existing `pulseHudPill` line.

## Runtime Data Flow

### `loop(now)` integration

```
loop(now):
  if (pageHidden) → render only, return                              [unchanged]
  frameDt = clamp((now − last)/1000, 0, 0.08); last = now            [unchanged]
  ⊕ frozen = (mode === "play") && GameFeel.tickHitstop(frameDt)
  ⊕ if (frozen):
  ⊕   render(); requestAnimationFrame(loop); return
  accumulator = min(accumulator + frameDt, FIXED_DT × 4)             [unchanged]
  while (accumulator ≥ FIXED_DT) { update(FIXED_DT); accumulator −= FIXED_DT }
  render(); requestAnimationFrame(loop)
```

Invariant: hit-stop pauses simulation, never rendering. The accumulator does not drain during hit-stop, so post-freeze playback resumes from the same simulation cursor.

### `update(dt)` integration

```
update(dt):
  if (mode !== "play" || !player || !activeLevel) return             [unchanged]
  player.elapsed += dt
  updateInputs()
  updateMoving(dt)
  ⊕ wasOnGround = player.onGround
  ⊕ player.prevVy = player.vy                  ← captured BEFORE physics tick
  updatePlayer(dt)
  ⊕ if (player.onGround && !wasOnGround && player.prevVy > 380):
  ⊕   GameFeel.landingPuff(spawnSpark, player.x + player.w/2, player.y + player.h,
  ⊕                        clamp((player.prevVy - 380)/800, 0.2, 1.0),
  ⊕                        save.settings.fx)
  updateEnemies(dt)
  updateProjectiles(dt)
  updatePickups()
  updateParticles(dt)
  updateCamera(dt)                              ← now reads camera.lookX/lookY
  updateChapterIntro(dt)
  updateHud()                                   ← skill_ready cue fires on cooling true→false (skill became ready)
```

### Audio cue node graph

Each `audioBus.cue(name)` constructs:

```
osc1 (wave, freq schedule)  ──▶  [biquad lowpass (optional)]  ──▶  gain (envelope)  ──▶  destination
                                                                           ▲
osc2 (wave, +detune)  ──▶  osc2Gain (mix)  ────────────────────────────────┘     (optional)
```

Envelope:

```
gain.gain.setValueAtTime(0.0001, t)
gain.gain.linearRampToValueAtTime(peak, t + attack/1000)
gain.gain.exponentialRampToValueAtTime(0.0001, t + (attack + release)/1000)
```

Cleanup: `osc.stop(t + (attack + release)/1000 + 0.02)`. Web Audio garbage-collects after stop.

Guards: `volume === 0` early-exit; `AudioContext` unavailable → return; `ctx.state === "suspended"` → `ctx.resume().catch(() => {})` and proceed.

### State lifecycle

| State | Initialized | Mutated | Reset |
|---|---|---|---|
| `hitstopRemaining` (game-feel.js module-local) | game-feel.js IIFE load → 0 | `requestHitstop` adds, `tickHitstop` decrements | `game.js startLevel()`, `respawn()`, `handleVisibilityChange()` call `GameFeel.resetHitstop()` |
| `player.dashFreeze` | `startLevel` → 0 | informational only; freeze driven by `hitstopRemaining` | n/a |
| `player.prevVy` | `startLevel` → 0 | every `update(dt)` start | n/a |
| `wasOnGround` | each `update(dt)` | n/a | discarded after frame |
| `camera.lookX`, `camera.lookY` | `startLevel` → 0 | every `updateCamera(dt)` | `respawn`, `updatePortals` (post-teleport), `handleVisibilityChange` → 0 |
| `view.isMobileLandscape`, `view.reducedMotion` | `resize()` | `resize()` re-evaluates | n/a |
| BGM retry listeners | `init()` via `armAutoplayRetry()` | self-fire; auto-remove on success or when `bgmRequested === false` | n/a |
| `RespawnVeil` DOM element | lazily on first `flash()` | `flash()` shows / hides | removed on `animationend` of fade-out |

### DOM z-index ordering

```
top    ┌─ love-letter / love-heart / love-toast      (existing)
       ├─ modal #modal                               (existing)
       ├─ ⊕ respawn-veil                             ← NEW slot
       ├─ HUD #overlay                               (existing)
       ├─ panels .screen.active                      (existing)
       ├─ ambient strip / left / right               (existing)
       └─ canvas #game                               (existing)
bottom
```

## Edge Cases and Robustness Contract

### Lifecycle edges

- Page hides during hit-stop: `handleVisibilityChange()` (game.js:2639) calls `GameFeel.resetHitstop()`. The world resumes unfrozen on return; the player would not expect to come back to a paused stomp.
- Page hides during respawn fade: the veil DOM element is removed in `handleVisibilityChange()` so no orphan overlay appears on resume.
- Two respawns within 180 ms (rapid death loop): `RespawnVeil.flash()` cancels in-flight animation by removing the `.playing` class, forcing reflow (`void el.offsetWidth`), and re-adding the class. Same trick `pulseHudPill` already uses.
- Portal teleport mid-frame: `updatePortals()` calls `cameraLookaheadReset(camera)` immediately after the position swap, so the smoothed camera does not lurch toward the prior facing.
- Pause modal opens during gameplay: hit-stop is gated on `mode === "play"` in the `loop()` integration. When paused, hit-stop is ignored.

### Capability edges

- `window.matchMedia` undefined (Node test env): `view.isMobileLandscape = false`, `view.reducedMotion = false`. Cached at `resize()`.
- `AudioContext` unavailable: `audioBus.cue(...)` returns early (matches existing `beep()` behavior at audio.js:81).
- `AudioContext` in `suspended` state at cue time: `ctx.resume().catch(() => {})` and proceed. The cue may miss precise onset; the next cue fires correctly.
- `navigator.vibrate` unavailable: existing `haptic()` already swallows; no change.

### Motion preference contract

`prefers-reduced-motion: reduce` causes the following collapses:

- Hit-stop: `requestHitstop(ms)` is a no-op; `ms` effectively 0.
- Dash freeze: 0 (uses hit-stop infrastructure).
- Landing puff: unchanged (gated by `save.settings.fx`; tactile, not motion).
- Shake: existing × 0.30 multiplier in `clampShake`.
- Camera lookahead: `MAX_LOOKAHEAD_X = 0`, `MAX_LOOKAHEAD_Y = 0`. Smoothing still runs but contributes nothing visible.
- Respawn veil: fade collapses to a single 40 ms flash; no in/hold/out.
- Audio cues: unchanged (audio is functional, not motion — matches docs/MOTION.md contract).
- BGM retry: unchanged (audio is functional).

These rows extend the existing reduced-motion list at docs/MOTION.md lines 64–75 and are added to MOTION.md during implementation.

### Concurrency and stacking edges

- Multiple hit-stop sources in same frame: `requestHitstop` takes max, never sums. Cap 120 ms.
- Stomp 50 ms + projectile-hit 35 ms in one frame: max is 50 ms. No compounding.
- Cue fires during hit-stop: allowed and intentional. The cue plays into the freeze gap and reinforces the impact.
- Multiple cues in same frame: all play; Web Audio mixes naturally. No throttling.
- Landing puff + stomp same frame (player stomps from height): both fire; visually distinct (amber stomp burst vs dust ivory puff).
- Variable-jump cut + jump release same frame: no concern; the existing logic at game.js:1035 is unchanged.

### Module-loading edges

- `game-feel.js` parse error → `window.NiniYuanGameFeel` undefined: all call sites use optional chaining (`GameFeel?.requestHitstop?.(50)`). Same defensive pattern as `Hud.pulseHudPill?.(...)` at game.js:2405. Game runs without the feature.
- Test env loads modules under Node: each module's tail uses `if (typeof module !== "undefined" && module.exports) module.exports = api;` — matches existing pattern (storage.js:130, audio.js:118, hud.js:129).
- Script load order: new `<script defer>` tags inserted in `index.html` BEFORE `<script src="./src/game.js"></script>`. `defer` preserves document order.
- `armAutoplayRetry()` called twice: idempotent via instance-local `armed` flag (owned by the bus instance returned from `createAudioBus()`); second call no-ops.
- Listener fires but `bgmRequested === false`: remove listeners and clear `armed`.
- Listener fires but page is `document.hidden`: skip retry; keep listeners attached for next gesture (the reason `{ once: true }` is intentionally not used).

## Test Plan

### New regression file: `tests/gamefeel-v1_5_0.js`

13 assertions, pure-node where possible, mock-host where Web Audio is needed:

1. Hit-stop math: `requestHitstop(50)` + `tickHitstop(0.020)` returns frozen, remaining ≈ 30 ms; subsequent `tickHitstop(0.040)` returns unfrozen, remaining 0.
2. Hit-stop cap: `requestHitstop(200)` clamps to 120 ms.
3. Take-max not sum: `requestHitstop(30); requestHitstop(50)` ⇒ remaining = 50.
4. Reduced-motion hit-stop: with mock matchMedia reduced=true, `requestHitstop(50)` is a no-op.
5. Camera lookahead bounds: `|lookX| ≤ 1`, `|lookX × 56| ≤ 56`; final `targetX` never leaves `[0, levelW − viewW]` after the existing clamp.
6. Lookahead reset: `cameraLookaheadReset(camera)` zeros `lookX/lookY` immediately, no smoothing.
7. Shake clamp matrix:
   - `clampShake(0, 13, false, false) === 13`
   - `clampShake(0, 13, true, false) === 8.45`
   - `clampShake(10, 5, false, false) === 10`
   - `clampShake(0, 13, false, true) === 3.9`
8. Audio cue table completeness: every cue name from the documented 16-entry list exists in `CUE_TABLE`; each entry has `wave`, `freq`, `attack`, `release`, `gain`.
9. Cue node graph (mock AudioContext):
   - `cue("jump")` constructs 1 oscillator, 1 gain, 0 biquads.
   - `cue("dash")` constructs 1 oscillator, 1 biquad, 1 gain.
   - `cue("portal")` constructs 2 oscillators, 1 mix gain, 1 main gain.
10. BGM retry attachment: `armAutoplayRetry()` attaches `pointerdown` and `keydown` listeners on a mock window; second call no-ops; after the listener fires successfully, both listeners are removed.
11. Variable-jump pin (drift guard): the literal substrings `vy < -160` and `* 0.56` exist in `src/game.js`.
12. Coyote and buffer pin (drift guard): the literals `coyote = 0.12` and `jumpBuffer = 0.14` exist in `updatePlayer`.
13. Hit-stop reset: `requestHitstop(80); resetHitstop(); tickHitstop(0)` returns unfrozen, remaining 0.

Plus a landing-puff integration check: with a mock `spawnSpark`, `landingPuff(spy, 100, 100, 0.5, true)` triggers spy at least once; `fxOn=false` triggers spy zero times.

### Updates to existing tests

- `tests/audio-bgm.js` — add `armAutoplayRetry` listener-attach assertions.
- `tests/menu-polish-v1_2_3.js`, `tests/aesthetic-polish-v1_2_4.js` — version pin loosened to accept `1.5.0` and `nini-yuan-v1.5.0-game-feel`.
- `tests/typography-copy-v1_4_0.js` — verify no new Chinese glyph appears in v1.5.0 release notes that is not already covered by the local font subsets. If new glyphs appear, regenerate subsets per existing v1.3.1 / v1.4.0 procedure.
- `tests/run-all.js` — wire `gamefeel-v1_5_0.js` into the run list.
- `tests/browser-smoke.js` — add a step on chapter 1: simulate `keydown(Space)` after page load; assert `<audio>.paused === false` within 200 ms; assert no new console errors.
- `tests/content-expansion-v1_4_0.js`, `tests/portal-mechanics-v1_4_0.js`, `tests/phase-tide-v1_4_0.js` — no changes (v1.5.0 does not touch content).

### Manual playtest checklist

Polish is partly perceptual; automated tests cannot fully assert "feels good". Run on desktop Chrome and Android debug APK:

- Yuan dash anticipation reads (snap before launch).
- Stomp impact feels weighted (hit-stop is felt, not just seen).
- Projectile-on-enemy hit registers without sluggish drag.
- `hurt()` 70 ms freeze is meaty without being annoying on rapid hits.
- Landing from height shows dust; small drops do not trigger.
- Camera lookahead is felt at full Yuan dash on chapters 5, 10, 15; nothing important goes off-screen.
- Vertical lookahead helps in chapters 3 and 11 (high-fall sections).
- Death → respawn ink veil reads as a beat, not a stutter.
- BGM blocked at first paint? Tap anywhere → BGM starts. Test by reloading without prior gesture.
- Mobile landscape: shake feels less harsh than desktop. Crystal break + hurt back-to-back does not nauseate.
- Audio cues feel layered (jump ≠ shoot ≠ dash ≠ stomp ≠ pickup); no shrill harshness; no clipping at max volume.
- Reduced-motion (devtools simulate): all motion features collapse correctly; audio cues unchanged.
- Settings → BGM volume slider drag → no localStorage write thrash visible in DevTools (this is a v1.5.1 perf concern; the manual check verifies no regression introduced here).

## Versioning and Release Metadata

- `package.json`: `1.4.0` → `1.5.0`.
- `package-lock.json`: `1.4.0` → `1.5.0`.
- `service-worker.js` `CACHE`: `nini-yuan-v1.4.0-world-3-phase-tide` → `nini-yuan-v1.5.0-game-feel`.
- `service-worker.js` `ASSETS`: add `./src/render/game-feel.js` and `./src/render/respawn-veil.js`.
- `android/app/src/main/AndroidManifest.xml`: `versionCode` 10 → 11; `versionName` `1.4.0` → `1.5.0`.
- `index.html`: insert `<script src="./src/render/game-feel.js" defer></script>` and `<script src="./src/render/respawn-veil.js" defer></script>` before `<script src="./src/game.js"></script>`.
- `manifest.webmanifest`: no change. The current description still applies.

No GitHub push or release publication happens until the user has reviewed the implementation.

## Documentation Updates

During implementation, update:

- `README.md` — bump version intro from v1.4.0 to v1.5.0; add a one-line note on the game-feel and audio cue work.
- `CHANGELOG.md` — prepend a `## v1.5.0` stanza describing the polish pass and the cue table.
- `docs/GDD.md` — bump version reference; add a one-line note in Mechanics about hit-stop and camera lookahead.
- `docs/MOTION.md` — add hit-stop, dash freeze, landing puff, respawn veil, and camera lookahead entries to the Signature Micro-Interactions section; add the corresponding rows to the Reduced Motion section; reference the audio cue table.
- `docs/DESIGN.md` — add a small audio cue subsection describing the named cue contract.
- `docs/plans/OPTIMIZATION_PLAN_v1.5.0.md` — new release record mirroring the v1.4.0 plan structure (objective, scope, tests, verification targets, completion notes).
- `docs/plans/README.md` — link to the new v1.5.0 plan.

## Verification Gate

```bash
npm test
npm run build:android
```

If the Android SDK is unavailable in the local environment, record the blocker and proceed (matches the v1.4.0 precedent).

## Implementation Boundaries

Expected high-risk files:

- `src/game.js`
- `src/core/audio.js`
- `src/render/game-feel.js` (new)
- `src/render/respawn-veil.js` (new)
- `styles.css` (only for the `respawn-veil` keyframe and z-index slot; nothing else)
- `tests/` files listed above
- `service-worker.js`
- `index.html`

Implementation should keep `src/game.js` changes localized: every edit is either a literal swap (`beep(...)` → `audioBus.cue(...)`) or a single-line insertion. No restructuring, no extraction of new functions inside `game.js`, no refactoring of unrelated mechanics while landing v1.5.0.

## Acceptance Criteria

- All 9 polish items verified by automated test or pinned by audit regression.
- 16 audio cues callable; mock-graph assertions pass; manual ear test confirms layering.
- BGM autoplay-retry attaches idempotent gesture listeners that self-remove after success; manual mobile test confirms BGM starts on first tap when initially blocked.
- Zero new runtime dependencies; zero new dev dependencies.
- Service worker cache key bumped — players auto-receive the new shell.
- All v1.4.0 regression tests pass with version pin loosening only.
- Manual playtest checklist signed off.
- No build artifacts (`build/`, `dist/`, `android/app/src/main/assets/`) committed.

## Rollback Plan

- The release lands as a single squashed `feat: ship v1.5.0 game-feel & sound design` commit on `main`. Revert with `git revert <sha>`.
- Service worker cache key change forces clients to re-fetch the shell on revert. Bumping the cache name once more on the revert commit ensures clients do not get stuck on the v1.5.0 shell.
- Save schema is untouched. v1.4.0 saves remain valid; no migration concerns.
- Android: prior debug APKs in local `dist/` (if retained) are installable as a downgrade for local testing.
