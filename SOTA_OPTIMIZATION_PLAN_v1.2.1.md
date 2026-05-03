# Focused Gameplay Bugfix Plan and Completion Record - v1.2.1

Version scope: `v1.2.0` to `v1.2.1`
Baseline commit: `77e20d4`
Date: 2026-05-03
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.2.1 update is a targeted gameplay fix release. It keeps the v1.2.0 visual shell and the v1.1.0 content baseline intact, and focuses on the reported gameplay defects and the follow-up enemy readability issue:

- chapter 3 and chapter 5 wind fields looked active but did not produce a meaningful gameplay response, then needed calibration so they remained enterable while walking or jumping into the wind;
- ground enemies could appear to walk while visually floating above or beyond their supporting platform, or turn before using the full supporting platform in any chapter;
- wisp enemies were intentionally non-ground enemies, but their previous near-ground blob silhouette was too similar to slimes/embers and could be interpreted as a grounded enemy alignment defect.

The web build and Android WebView build share the same `src/game.js`, so this fix applies to both runtimes after the Android build script copies the source tree into `android/app/src/main/assets/`.

## Diagnosis

### Wind fields

Root cause: wind in `src/game.js` was applied as a low-magnitude post-input velocity adjustment after the normal movement target had already been resolved. At 120 Hz, chapter wind forces of roughly 300-360 px/s^2 added only about 2.5-3 px/s per step, while normal air movement correction could remove about 21-23 px/s per step. Wind fields rendered correctly but had little observable effect during normal play.

### Ground enemies

Root cause: enemies were defined as `38 x 34` objects with `y: y * TILE`, while level data placed them one tile above the platform row. Because `TILE` is 48 px, their visible bottom landed 14 px above the intended platform top. `updateEnemies` also moved ground enemies by patrol distance only, without snapping to support or checking the next front-foot position.

### Wisp readability

Root cause: wisps were treated as floating enemies in update logic, but after enemy bottom-alignment they still shared the same compact blob silhouette and near-ground presentation as slimes/embers. The player could not reliably distinguish intentional hover from incorrect ground contact.

## Scope

### Gameplay logic - `src/game.js`

- Add explicit wind balance constants.
- Feed active wind into the player's horizontal velocity target before acceleration is resolved.
- Calibrate wind so holding movement into the wind still makes forward progress both on the ground and while jumping.
- Draw wind-direction arrowheads inside wind fields, with arrow movement matching positive and negative wind direction.
- Surface active wind in the HUD status pill.
- Spawn ground enemies bottom-aligned to their intended platform row.
- Draw ground enemy contact feet and shadow so the alignment is readable.
- Keep wisp enemies as bounded floating enemies, spawn them above the platform row with a stable visible gap, and render them as winged aurora wisps with no ground feet.
- Use the current supporting platform as the patrol boundary for slimes and embers, so they patrol the full platform without stepping past its edges.

### Tests

- Add `tests/gameplay-bugfix.js`.
- Include the new guard in `tests/run-all.js`.
- Keep existing physics, mechanics, browser smoke, accessibility, PWA, Android wrapper, and storage tests in the release gate.

### Versioning and docs

- Bump `package.json` and `package-lock.json` to `1.2.1`.
- Bump Android `versionCode` to 4 and `versionName` to `1.2.1`.
- Bump the service worker cache to `nini-yuan-v1.2.1-gameplay-fixes`.
- Update README, CHANGELOG, GDD, and Android manual testing notes.

## Non-Goals

- No new chapters, enemies, power-ups, art assets, audio, or UI screens.
- No save schema migration.
- No framework, bundler, or dependency change.
- No Android native behavior change beyond version metadata.

## Verification Targets

```bash
npm test
npm run build:android
```

Expected APK output:

```text
dist/NiniYuan.apk
```

Manual review should replay chapter 3 and chapter 5, confirm wind arrows point and move in the same direction, confirm wind changes landing positions without blocking movement or jump movement into it, confirm slime/ember enemies remain visually grounded while patrolling full supporting platforms in all chapters, and confirm wisps present as flying enemies with a clear hover gap.

## Completion Record

### Verification

- `npm test` passed on 2026-05-03.
  - Includes syntax checks for core scripts and service worker.
  - Includes `physics-balance`, `mechanics-balance`, the new `gameplay-bugfix`, storage, atlas, docs-link, render-touch-polish, CI workflow, Android wrapper, audio, PWA, lifecycle, save tampering, service worker registration, accessibility, and browser smoke checks.
- `npm run build:android` passed on 2026-05-03 and produced `dist/NiniYuan.apk`.
- APK badging confirms `versionCode=4`, `versionName=1.2.1`, `compileSdkVersion=36`, `min-sdk-version=23`, and `targetSdkVersion=36`.
- APK assets contain the updated `service-worker.js` cache name `nini-yuan-v1.2.1-gameplay-fixes` and the updated gameplay/wisp readability guards in `assets/src/game.js`.

### Residual Notes

- Manual Android emulator validation remains part of the release gate for store submission because it verifies vendor WebView behavior, touch latency, and device-specific rendering.
- Wisps are intentionally flying enemies after this pass; the grounding fix targets slime and ember ground enemies.
