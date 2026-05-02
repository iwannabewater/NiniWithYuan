# Character Atlas Specification

The current release still uses `assets/characters/nini-v2.png` and `assets/characters/yuan-v2.png` as single-frame character art. Version 1.1.0 adds atlas placeholders and loader support so production sprite sheets can replace the single-frame PNGs without changing gameplay code.

## Paths

```text
assets/characters/nini/atlas.json
assets/characters/yuan/atlas.json
```

The atlas image may live in the character directory or reference an existing PNG. The `image` path is relative to the atlas file.

## Schema

```json
{
  "image": "../nini-v2.png",
  "frame": { "w": 96, "h": 128 },
  "animations": {
    "idle": { "frames": [0, 1, 2, 3, 2, 1], "fps": 6, "loop": true },
    "run": { "frames": [4, 5, 6, 7, 8, 9], "fps": 12, "loop": true },
    "jump": { "frames": [10, 11], "fps": 12, "loop": false },
    "fall": { "frames": [12, 13], "fps": 8, "loop": true },
    "hurt": { "frames": [14, 15], "fps": 14, "loop": false },
    "skill": { "frames": [16, 17, 18, 19], "fps": 16, "loop": false }
  }
}
```

## Frame Numbering

Frames are numbered left to right, then top to bottom. For example, when `frame.w = 96` and the image width is `576`, each row contains six frames:

```text
0  1  2  3  4  5
6  7  8  9  10 11
```

## Current Placeholder

The current atlas files use `frame: { "w": 1, "h": 1 }`. A 1 x 1 frame instructs the loader to draw the full PNG instead of cropping frames.

## Animation Selection

`src/game.js` selects animations by state:

- `hurtFlash > 0` selects `hurt`;
- Nini gliding or Yuan dashing selects `skill`;
- airborne upward velocity selects `jump`;
- airborne downward velocity selects `fall`;
- grounded movement selects `run`;
- all other states select `idle`.

## Validation

```bash
node tests/character-atlas.js
```

This test validates schema shape and animation fields. It does not evaluate art quality.
