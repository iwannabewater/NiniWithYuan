# Character Atlas Specification

The current workspace build uses production 4 x 4 character atlases for both protagonists:

```text
assets/characters/nini/nini-atlas-v1.png
assets/characters/yuan/yuan-atlas-v1.png
assets/characters/nini/atlas.json
assets/characters/yuan/atlas.json
```

The older single-frame PNGs remain in `assets/characters/` as legacy fallback material, but gameplay now loads the versioned atlas PNGs and their JSON descriptors.

## Direction

The atlas art follows the **宋式星图器物幻想 / Song-atlas Night Observatory** direction recorded in [docs/DESIGN.md](DESIGN.md).

- Nini keeps purple hair, rose identity, layered Song-informed garments, and the Xuanji Star Dial.
- Yuan keeps deep indigo hair, jade-cyan identity, layered Song-informed garments, and the Jade Gui Sword.
- Gameplay sprites are independent from the high-detail paired menu illustration. Do not shrink the cover art into gameplay frames.
- Both atlases must preserve transparent backgrounds, generous padding, and readable silhouettes at small canvas scale.

## Schema

Each atlas JSON file is relative to its character directory:

```json
{
  "image": "nini-atlas-v1.png",
  "frame": { "w": 320, "h": 320 },
  "animations": {
    "idle": { "frames": [0], "fps": 7, "loop": true },
    "run": { "frames": [1], "fps": 14, "loop": true },
    "turn_left": { "frames": [2], "fps": 18, "loop": false },
    "turn_right": { "frames": [3], "fps": 18, "loop": false },
    "jump_left": { "frames": [4], "fps": 15, "loop": false },
    "jump_right": { "frames": [5], "fps": 15, "loop": false },
    "fall": { "frames": [6], "fps": 12, "loop": true },
    "land_left": { "frames": [7], "fps": 18, "loop": false },
    "land_right": { "frames": [8], "fps": 18, "loop": false },
    "shoot_left": { "frames": [9], "fps": 18, "loop": false },
    "shoot_right": { "frames": [10], "fps": 18, "loop": false },
    "skill_left": { "frames": [11], "fps": 20, "loop": false },
    "skill_right": { "frames": [12], "fps": 20, "loop": false },
    "hurt_left": { "frames": [13], "fps": 18, "loop": false },
    "hurt_right": { "frames": [14], "fps": 18, "loop": false }
  }
}
```

Yuan may use a higher `skill_left` and `skill_right` FPS because dash poses should feel sharper than Nini glide poses. An animation may set `"mirror": true` when the paired authored cell is unusable and a clean opposite-facing pose is safer. The runtime never mirrors a named left or right pose unless this flag is present, which prevents authored direction from being flipped twice.

Yuan v1 deliberately mirrors frame 2 for `turn_left` and frame 12 for `skill_left`. This avoids the invalid left-turn drawing and the contaminated frame 11 cell in the generated source sheet while keeping the clean garment and sword silhouette visible in both travel directions.

## Frame Numbering

Frames are numbered left to right, then top to bottom:

```text
0   1   2   3
4   5   6   7
8   9   10  11
12  13  14  15
```

The sixteenth frame can remain unused as padding or a future special frame.

## Animation Selection

`src/render/character-motion.js` resolves animation intent before `src/game.js` draws the sprite. Priority is:

1. Hurt flash: `hurt_left` or `hurt_right`.
2. Skill pose: Nini glide or Yuan dash becomes `skill_left` or `skill_right`.
3. Shoot pose: recent projectile fire becomes `shoot_left` or `shoot_right`.
4. Landing pose: recent hard landing becomes `land_left` or `land_right`.
5. Direction change: `turn_left` or `turn_right`.
6. Airborne upward velocity: `jump_left` or `jump_right`.
7. Airborne downward velocity: `fall`.
8. Grounded movement: `run`.
9. Rest: `idle`.

The resolver also returns lean, lift, bob, and scale hints. These are presentation-only and must not change collision boxes, movement speed, jump height, dash distance, cooldowns, or save data.

## Source Art

Generated source sheets are preserved for future art passes:

```text
assets/characters/nini/nini-pose-sheet-source-v1.png
assets/characters/yuan/yuan-pose-sheet-source-v1.png
```

Production files are transparent PNGs:

```text
assets/characters/nini/nini-atlas-v1.png
assets/characters/yuan/yuan-atlas-v1.png
```

If an atlas is regenerated on a chroma-key background, remove the key locally, validate transparent corners, then save a new versioned filename instead of overwriting the current production asset.

## Validation

```bash
node tests/character-atlas.js
node tests/character-motion.js
```

The atlas test validates schema shape, image existence, PNG dimensions, and maximum frame index. The motion test validates state priority and pose hint behavior. Neither test evaluates art quality, so every atlas replacement still requires screenshot review in gameplay.
