# Motion Guide

Motion in `Nini & Yuan` has two jobs: confirm intent and make the Song-atlas Night Observatory readable at speed. Control response belongs to the simulation. Animation, interpolation, particles, camera lead, and screen shake belong to presentation and must not change collision geometry or ability timing.

## Control Pipeline

`src/core/input-state.js` is the boundary between physical input and gameplay actions. `src/game.js` consumes actions only while the game is in `play` mode and no orientation dialog owns the surface.

1. `ACTION_BY_KEY_CODE` maps every gameplay key to `left`, `right`, `jump`, `skill`, or `shoot`. `GAMEPLAY_KEY_CODES` is derived from that map.
2. Keyboard, pointer, and synthesized activation each register a source reference such as `key:KeyD`, `pointer:7`, or `activation:jump`.
3. An action becomes active when its first source is added. It becomes inactive only after its final source is released. This preserves holds when two keys or fingers represent the same action.
4. If left and right are both held, the most recently pressed source wins. Releasing it falls back to the direction that remains held.
5. The fixed-step update reads the resolved action state. It never reads DOM focus, pointer IDs, or raw keyboard aliases directly.

The left touch rail captures its pointer. A held finger may slide across the rail midpoint to switch between left and right without lifting. Pointer up, pointer cancellation, and lost capture release that source. Drift outside an individual button does not release it.

Touch buttons remain semantic buttons. A keyboard or assistive-technology click with `detail === 0` creates a 140 ms action hold, which gives movement and jump enough time to reach a fixed update. Pointer-generated clicks do not create a second press after `pointerdown`.

Every menu, modal, focus, blur, visibility, and orientation transition clears held actions, pressed edges, and pointer references together. A mapped physical key that remains down across a transition stays suppressed until its matching `keyup`.

## Response Contracts

- Character-specific launch acceleration reaches full ground speed within 140 ms.
- A full-speed ground reversal finishes within 190 ms. Neutral ground stopping finishes within 120 ms.
- Coyote time remains 120 ms and the jump buffer remains 140 ms.
- A grounded jump pressed during the first 100 ms of a chapter remains a ground jump and does not spend Nini's air jump.
- A valid short Nini skill press opens a 120 ms glide-intent window. The skill cooldown begins only when glide starts.
- Yuan records `dashDir` when a dash begins. Movement and the authored dash pose retain that direction until the dash ends.
- Pause and portrait orientation dialogs freeze simulation. Returning to play starts from cleared action state.

## Simulation and Presentation

The simulation runs at 120 Hz. A rendered frame executes no more than eight fixed steps, and lifecycle gaps clamp at 80 ms. Normal delivery at 60, 30, 25, or 20 fps preserves real simulation time; only overload beyond the guard drops whole steps.

Before each fixed step, `beginPresentationStep()` stores the previous player and camera coordinates. Rendering samples between those coordinates and the current simulation values with the accumulator ratio.

- Player and camera interpolation use the same render alpha.
- Samples quantize to `1 / devicePixelRatio`, so Canvas placement lands on physical-pixel boundaries without rounding to whole CSS pixels.
- Level entry frames the initial camera before the first rendered step.
- Portal travel, respawn, and other discontinuities request a presentation snap instead of drawing a sweep across the level.
- When hit-stop ends inside a frame that produces no fixed step, presentation history synchronizes to the current player and camera coordinates. The next frame cannot rewind the sprite or camera.

`presentation.motionState` owns animation state. Gameplay entities do not store render state. State entry time comes from the simulation clock, `player.elapsed`, so animation pauses with gameplay and remains stable across variable display rates.

Atlas frames use time elapsed since the current state began. Looping states wrap through their frame list. A state with `loop: false` starts on its first authored frame and holds its final frame after the sequence finishes.

Ground gait follows accumulated horizontal travel rather than wall time. Starts, stops, wall contacts, and reversals therefore keep the pose attached to actual movement.

## Presentation Pose Sampling

Rendering may blend bob, lean, stretch, and lift between consecutive resolved poses so gait and turn edges read cleanly at variable display rates. Blend math lives in `blendMotionPose` and uses a smoothstep alpha. Discrete entries for hurt, skill, and land snap immediately. Animation name, artifact identity, gait wave, stride, and direction always come from the latest resolved pose. Display pose fields live only on the presentation object.

Character sprites draw without canvas `shadowBlur` on the bitmap. Ground contact shadow is a separate ellipse. Destination rectangles align to the device-pixel quantum used by player and camera samples.

Landing readability is pure: a land pose holds while `landingTimer > 0.11` or stride remains under `0.62`. Faster landings hand back to run after the impact beat.

## Character State Selection

The resolver in `src/render/character-motion.js` selects presentation in this order:

1. Hurt.
2. Nini glide or Yuan dash.
3. Projectile attack.
4. Airborne jump or fall.
5. Readable landing beat.
6. Ground turn.
7. Run.
8. Idle.

Airborne direction changes retain a jump or fall pose instead of borrowing a grounded turn. A fast landing returns to run after its short impact beat. Yuan's dash-facing resolver uses `dashDir`, even if collision or later input changes `player.facing` during the active dash.

The complete atlas schema and orientation rules are recorded in [CHARACTER_ATLAS.md](CHARACTER_ATLAS.md).

## Camera, Hit-Stop, and Shake

Camera lookahead leads up to 56 px horizontally and 30 px vertically. Explicit reversal intent retargets horizontal lead before velocity crosses zero. Portal travel, respawn, and visibility changes reset lookahead.

Stomps, projectile hits, hurt, crystal breaks, and Yuan dash anticipation may request 35 to 70 ms of hit-stop. Hit-stop pauses simulation and keeps rendering active. Requests take the larger active value and are capped at 120 ms; they do not accumulate.

The `画面震动` setting is a persistent master switch. Turning it off clears current shake and blocks new shake requests. With shake enabled, mobile landscape scales event amplitude to 65 percent. Reduced motion scales it to 30 percent.

## Interface Motion

| Token | Value | Use |
| --- | --- | --- |
| `--d-fast` | 140 ms | Press, hover, and immediate feedback |
| `--d-base` | 240 ms | HUD chips, cards, dialogs, and toast |
| `--d-slow` | 520 ms | Screen entry and hero-card settling |
| `--d-breath` | 3.2 s | Optional touch readiness pulse |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entry and lift |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Short pop feedback |

DOM animation is limited to `transform` and `opacity` on small surfaces. The interface does not use `transition: all`, full-screen animated blur, animated masks, or `backdrop-filter`.

State changes, rather than render frequency, trigger HUD pulses. Canvas feedback uses short event-bound effects: landing dust, enemy hit flash, respawn veil, portal rings, collectible seals, and phase-tide silhouettes. Decorative field motion stops when the game is not on a menu surface.

## Reduced Motion

Under `prefers-reduced-motion: reduce`:

- Decorative CSS transitions and animations collapse to near-zero duration or pause.
- Hero parallax, pointer stardust, atlas-ring rotation, touch breathing, ambient drift, bossbar shimmer, and modal seal breathing stop.
- Hit-stop is disabled and camera lookahead contributes 0 px.
- Ink-scroll parallax and star-chart drift become static.
- The respawn veil becomes a single 40 ms flash.
- Gameplay timing, platform state, hazards, phase silhouettes, contact shadows, and essential event cues remain visible.
- Optional pickup bursts still follow the high-frame-rate visual-effects setting.

## Runtime Budgets

- HUD text, classes, and ARIA labels are written only when their rendered values change. Chapter progress is quantized to quarter-percent increments.
- Settings sliders preview immediately, persist after a 150 ms trailing delay, and flush on `change`, `visibilitychange`, or `pagehide`.
- Pointer stardust is limited to fine pointers, interpolates gaps at about 18 px, and caps the live particle count at 56.
- Canvas material helpers remain stateless. Collision geometry, render order, and gameplay state remain in `src/game.js`.

## Audio Timing

`src/core/audio.js` owns master, BGM, and semantic SFX levels. BGM starts after entering gameplay, pauses for menus and modal outcomes, and retries after a later gesture if WebView autoplay blocks the first request. Visibility loss suspends the audio context and pauses BGM. Foreground return resumes it only when gameplay remains active.

The current BGM is `Fairy Adventure` by MintoDog under CC0 1.0 Universal. Source and license details are in [assets/audio/NOTICE.md](../assets/audio/NOTICE.md).
