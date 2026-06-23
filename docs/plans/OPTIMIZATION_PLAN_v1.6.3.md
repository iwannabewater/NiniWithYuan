# Forward Idle Source-Facing Patch - v1.6.3

Version scope: `v1.6.2` to `v1.6.3`

## Goal

Ship a focused Web/PWA and Android reliability patch that makes Nini's default idle direction read forward-right on the game's left-to-right route. Preserve all physics, chapter content, input bindings, offline operation, save key, schema version 2, and paired launcher identity.

## Root cause

The runtime default `player.facing` was already right-facing, and browser smoke confirmed the Canvas transform followed that state. The visual bug came from Nini's complete idle source frame: frame 0 faces left in the atlas, while the resolver and tests assumed every generic idle source frame faced right.

## Behavioral contract

- A fresh Nini level starts visually forward-right.
- Nini retains a left-facing idle after explicit left movement and a forward-right idle after explicit right movement.
- Yuan keeps the existing right-facing idle source behavior.
- Neutral input, environmental drift, and velocity decay do not overwrite the last explicit left or right direction.
- Physics constants, levels, save schema, and Android wrapper behavior are unchanged.

## Implementation

- Add atlas `sourceFacing` metadata for generic source cells whose visual direction is not the runtime default.
- Mark Nini's `idle` source as `"left"` while leaving Yuan's idle source unchanged.
- Update `resolveSpriteOrientation` so generic non-authored poses compose retained `facing` with the source-facing metadata.
- Update unit and browser smoke checks to assert each protagonist's idle transform from the manifest contract, not a global sign assumption.
- Bump package metadata, Android badging, cache key, README, changelog, GDD, Android testing notes, and plan index to v1.6.3.

## Verification

- `node tests/character-atlas.js`
- `node tests/character-motion.js`
- `node tests/browser-smoke.js`
- `npm test`
- `npm run build:android`
- Desktop and mobile-landscape screenshots should show Nini facing forward-right at level start.
- APK badging must report `versionCode=16`, `versionName=1.6.3`, `minSdkVersion=23`, and `targetSdkVersion=36`.

## Release boundaries

- Patch release only.
- No new dependency, physics tuning, level content, save migration, network call, or release lane change.
