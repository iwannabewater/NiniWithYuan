# Character Atlas Specification

Nini and Yuan use independent 4 by 4 production atlases. Menu illustration and gameplay sprites are separate assets with separate scale and composition requirements.

```text
assets/characters/nini/nini-atlas-v1.png
assets/characters/yuan/yuan-atlas-v1.png
assets/characters/nini/atlas.json
assets/characters/yuan/atlas.json
```

The older single-frame files in `assets/characters/` remain fallback material. Gameplay loads the versioned PNG and JSON pair for each character.

## Art Direction

The atlas follows the Song-atlas Night Observatory direction in [DESIGN.md](DESIGN.md).

- Nini keeps purple hair, a rose identity, layered Song-informed clothing, and the Xuanji Star Dial.
- Yuan keeps deep indigo hair, a jade-cyan identity, layered Song-informed clothing, and the Jade Gui Sword.
- Both characters need a readable head, tool, travel direction, and foot contact at compact Canvas scale.
- Each PNG uses a transparent background, fixed 320 by 320 cells, and enough cell padding to avoid clipped hair or garments.
- The paired menu illustration must not be reduced into gameplay frames.

## Descriptor Schema

Each descriptor is relative to its character directory:

```json
{
  "image": "nini-atlas-v1.png",
  "frame": { "w": 320, "h": 320 },
  "animations": {
    "idle": {
      "frames": [0],
      "fps": 7,
      "loop": true,
      "sourceFacing": "left"
    },
    "run": { "frames": [1], "fps": 14, "loop": true },
    "turn_left": { "frames": [2], "fps": 18, "loop": false },
    "turn_right": { "frames": [3], "fps": 18, "loop": false }
  }
}
```

Required animation names are:

```text
idle
run
turn_left, turn_right
jump_left, jump_right
fall
land_left, land_right
shoot_left, shoot_right
skill_left, skill_right
hurt_left, hurt_right
```

`frames` is an ordered list of zero-based cell indices. `fps` controls state-local sampling. `loop: false` starts on the first authored frame and holds the last frame after the sequence finishes.

`sourceFacing` describes the direction drawn in a generic cell. The runtime combines it with retained travel direction when it mirrors idle or run. Nini's idle source faces left and declares `sourceFacing: "left"`; Yuan's idle source faces right and uses the default.

Named left and right poses are treated as authored directions. The runtime does not mirror them unless the descriptor sets `mirror: true`. Yuan v1 mirrors frame 2 for `turn_left` and frame 12 for `skill_left`, which avoids contaminated source cells while preserving a clean silhouette.

Yuan may use a higher skill FPS than Nini because the dash pose needs a sharper attack beat. FPS affects presentation only. Dash duration remains a gameplay constant.

## Frame Numbering

Frames run left to right, then top to bottom:

```text
0   1   2   3
4   5   6   7
8   9  10  11
12 13  14  15
```

Frame 15 remains unused because both source figures cross its top boundary. Fixed-cell sampling would clip their hair.

## Runtime Ownership

`src/render/character-motion.js` resolves pose, orientation, state entry, elapsed state time, and atlas sampling. `src/game.js` owns one `presentation.motionState` object and passes current gameplay facts into the resolver.

The player entity must not store `motionState`, current frame, or animation entry time. Those fields have no effect on physics, collision, health, cooldowns, save data, or terminal outcomes.

Animation entry time uses the simulation clock, `player.elapsed`, rather than wall time. The same gameplay state therefore produces the same frame sequence at 20, 60, or 120 rendered frames per second. Pause, orientation gating, and hit-stop do not advance atlas time.

## State Selection

The resolver uses this priority:

1. `hurt_left` or `hurt_right`.
2. Nini glide or Yuan dash as `skill_left` or `skill_right`.
3. Recent projectile fire as `shoot_left` or `shoot_right`.
4. Airborne rise as `jump_left` or `jump_right`, or descent as `fall`.
5. A readable landing beat as `land_left` or `land_right`.
6. Ground direction change as `turn_left` or `turn_right`.
7. Ground travel as `run`.
8. Rest as `idle`.

Airborne turns keep an airborne pose. The new direction still updates orientation, but a grounded turn cell never replaces jump or fall. Fast landings return to run after the short impact beat so the animation does not hold back locomotion.

Yuan's active skill orientation follows `dashDir`, the direction captured when the dash began. It does not follow a later change to the general facing field.

The resolver also returns lean, lift, bob, stretch, and artifact hints. These values are presentation-only. Run cadence uses distance-driven gait phase; idle and ability accents use the simulation clock.

## Canvas Placement

The renderer receives interpolated player coordinates from the fixed-step presentation pipeline. It places the sprite at those coordinates without rounding the transform to whole CSS pixels. Player and camera samples quantize to a physical-pixel step derived from `devicePixelRatio`.

Portal travel, respawn, and level entry snap presentation history. Hit-stop completion synchronizes history when no fixed step occurs, so the character cannot render a one-frame rewind.

## Source and Production Files

Generated source sheets remain available for later art passes:

```text
assets/characters/nini/nini-pose-sheet-source-v1.png
assets/characters/yuan/yuan-pose-sheet-source-v1.png
```

Production files are the transparent atlas PNGs listed at the top of this document. If a new sheet begins on a chroma-key background, remove the key locally, inspect transparent corners and cell edges, then write a new versioned filename. Do not overwrite the current production atlas in place.

## Validation

```bash
node tests/character-atlas.js
node tests/character-motion.js
node tests/gamefeel-v1_6_1.js
node tests/browser-smoke.js
```

The unit tests cover schema shape, frame lists, non-loop terminal sampling, state-local timing, direction metadata, airborne turns, fast landings, Yuan dash-facing, and idle orientation. Browser smoke checks transparent safety margins and retained left and right transforms. Every atlas replacement still requires a gameplay screenshot review at desktop and compact landscape sizes.
