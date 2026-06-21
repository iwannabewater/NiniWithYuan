# Directional Idle and Paired Icon Patch — v1.6.2

Version scope: `v1.6.1` to `v1.6.2`

## Goal

Ship a focused Web/PWA and Android bug-fix release that restores last-direction idle behavior, removes idle atlas clipping, and makes the paired protagonists the application launcher identity. Preserve physics, chapter content, input bindings, offline operation, save key, and schema version 2.

## Behavioral contract

- A fresh level starts with both protagonists facing right.
- The last explicit left or right movement input controls the later idle orientation; neutral input, environmental drift, and velocity decay do not overwrite it.
- Idle art uses frame 0 and remains inside the fixed atlas cell at every supported render scale.
- Web/PWA and Android icons derive from one 512 px paired Nini-and-Yuan release master and survive square, round, and adaptive masks.

## Verification

- `node tests/character-atlas.js`
- `node tests/character-motion.js`
- `node tests/app-icon-v1_6_2.js`
- `node tests/browser-smoke.js`
- `npm test`
- `npm run build:android`
- APK badging must report `versionCode=15`, `versionName=1.6.2`, `minSdkVersion=23`, and `targetSdkVersion=36`.

## Release boundaries

- Patch release only; no physics, ability, content, save, dependency, or native runtime changes.
- Android distribution remains the reproducible debug APK lane documented by the project.
