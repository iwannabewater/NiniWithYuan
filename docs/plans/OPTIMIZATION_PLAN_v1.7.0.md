# Readability and Interaction Polish - v1.7.0

Version scope: `v1.6.3` to `v1.7.0`

## Goal

Ship a focused readability and interaction-polish release that improves phase-route timing, enemy/monster readability, impact feedback, and E2E stability while preserving all physics constants, chapter content, input bindings, offline operation, save key, and schema version 2.

## External references

- Celeste's game-feel writeup by Maddy Thorson emphasizes forgiving timing and positioning windows that make difficult play feel fair: https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html
- Game Developer's Dead Cells GDC summary highlights small player-favoring corrections and clear constraints when platforming is not the core punishment surface: https://www.gamedeveloper.com/design/the-secrets-of-dead-cells-smart-constraints-unlocking-the-vault-3
- Team Cherry's Hollow Knight introduction explains the value of simple, efficient enemy and world silhouettes for a diverse cast: https://www.teamcherry.com.au/blog/introducing-hollow-knight
- Game Developer's Ori and the Will of the Wisps interview describes platforming polish as an interdisciplinary result of controls, animation, sound, particles, and repeated testing: https://www.gamedeveloper.com/design/q-a-designing-the-gorgeous-metroidvania-i-ori-and-the-will-of-the-wisps-i-

## Transfer into this project

- Keep the existing Celeste-like forgiveness already present in this project: coyote time, jump buffer, camera lookahead, landing feedback, and hit-stop stay pinned.
- Apply Dead Cells-style constraint clarity by making non-core frustration surfaces easier to read: phase-tide timing and enemy patrol intent are communicated before they punish the player.
- Apply Hollow Knight-style silhouette discipline by making slimes, embers, and wisps more distinct through palette, support, tether, and hit-flash treatments rather than adding heavy new assets.
- Apply Ori-style layered feedback by coordinating HUD text, canvas marks, particles, and E2E visual checks instead of changing the platforming model.

## Implementation

- Extend `phaseTideState()` with `remaining` and `urgency` fields.
- Format World 3 HUD status through `phaseTideLabel()` with one-decimal phase time remaining.
- Add `ENEMY_HIT_FLASH_DURATION` and short enemy `hitTimer` feedback on projectile impact.
- Add `drawEnemyIntent()` and `drawEnemyHitFlash()` so ground enemies show support-platform patrol rails and wisps show dashed hover tethers.
- Refine `drawGroundEnemy()` through `enemyPalette()` so slimes and embers read as different creature types while keeping their existing bounds.
- Stabilize `tests/e2e/accessibility.js` by waiting for the active screen's own entry animation before clicking back controls.
- Add `tests/readability-polish-v1_7_0.js` and wire it into `npm test`.
- Bump package metadata, Android badging, cache key, README, changelog, GDD, Motion Guide, Android testing notes, and this plan index to v1.7.0.

## Behavioral contract

- Fixed-step physics remains `FIXED_DT = 1 / 120`.
- Nini and Yuan jump heights, dash distance, glide duration, coyote time, and jump buffer are unchanged.
- The fifteen-chapter structure and save schema version 2 are unchanged.
- Enemy health, patrol, collision, stomp, projectile, and Yuan dash-kill rules are unchanged.
- The new enemy intent marks are visual only and must not introduce blocking geometry or pointer targets.
- Accessibility navigation tests must not wait for decorative infinite animations.

## Verification

- `node tests/phase-tide-v1_4_0.js`
- `node tests/readability-polish-v1_7_0.js`
- `node tests/e2e/accessibility.js`
- `node tests/browser-smoke.js`
- `npm test`
- Desktop gameplay screenshot should show `星潮 甲相/乙相 N.N` in the HUD without overflow.
- Gameplay screenshot with a visible enemy should show a quiet intent mark that does not cover the player, HUD, pickups, or platforms.
- APK badging must report `versionCode=17`, `versionName=1.7.0`, `minSdkVersion=23`, and `targetSdkVersion=36`.

## Completion notes

- `npm test` passed on 2026-07-09.
- `npm run capture:store` passed on 2026-07-09 and refreshed the nine ignored store images under `dist/store-assets/`.
- `JAVA_HOME="$PWD/tools/jdk-17.0.19+10/Contents/Home" PATH="$PWD/tools/jdk-17.0.19+10/Contents/Home/bin:$PATH" npm run build:android` passed on 2026-07-09 using a checksum-verified local Temurin 17 JDK in the ignored `tools/` directory.
- The Android build produced `dist/NiniYuan.apk` at roughly 14 MB; `aapt dump badging` reports package `com.iwannabewater.niniyuan`, `versionCode=17`, `versionName=1.7.0`, `minSdkVersion=23`, and `targetSdkVersion=36`.
- Visual spot checks covered `dist/store-assets/06-gameplay-landscape.png` and `dist/store-assets/08-gameplay-desktop.png`; HUD text, touch controls, and enemy intent marks remained readable without overlap.

## Release boundaries

- Minor polish release.
- No new dependency, save migration, network call, release lane change, or chapter content expansion.
- Build outputs (`build/`, `dist/`, `android/app/src/main/assets/`) remain ignored and must not be committed.
