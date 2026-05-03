# World 2 Content Expansion Plan — v1.3.0 "Star Gates"

Version scope: `v1.2.4` to `v1.3.0`
Baseline commit: `4615216`
Design spec: `docs/plans/WORLD_2_STAR_GATES_DESIGN.md`
Date: 2026-05-03
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.3.0 release is a content-first expansion. It keeps the v1.2.x visual shell, controls, physics feel, audio routing, offline storage model, Android WebView wrapper, and existing five chapters stable, then adds a second world with three handcrafted chapters and one new traversal mechanic: paired star gates.

The player-facing result should feel like the same game opening into a larger atlas. World 1 remains the original heart-stone arc. World 2, **第二星域 星门群岛**, adds route folding, optional collection loops, and a finale that combines gates, wind, moving platforms, crystals, hazards, and both character kits without turning the release into hard postgame content.

## Scope

### World Structure

- Group chapters 1-5 under **第一星域 破碎星图**.
- Add chapters 6-8 under **第二星域 星门群岛**:
  - `stargatecove` / `第六章 星门浅湾`
  - `loopinglighthouse` / `第七章 回环灯塔`
  - `ringconservatory` / `第八章 星环温室`
- Preserve linear unlock order and the existing numeric `save.unlocked` model.

### Star Gates

- Add optional `level.portals` data for levels that need paired gates.
- Portals are player-only, pair by ID, preserve velocity and facing, and apply a short cooldown plus an exit-gate lock after travel.
- Portal exits must be inside level bounds and avoid platform-solid overlap.
- Canvas rendering should be readable at gameplay scale and stay visually distinct from hazards, coins, power-ups, wind fields, and crystals.

### Save Compatibility

- Keep schema version 2.
- Clamp unlock progression to the new eight-chapter cap.
- Derive `unlocked >= 6` when existing saves show completed Aurora Citadel progress through `bestTimes.auroracitadel` or `levelStars.auroracitadel`.
- Do not grant World 2 access to saves that only unlocked chapter 5 without completion evidence.

### Interface and Metadata

- Insert world headings into chapter select without changing the surrounding screen flow.
- Preserve v1.2.4 chapter-card polish: featured compass, meridian rail, locked-card dimming, score-line hierarchy, and responsive behavior.
- Update visible copy and install metadata from five chapters to eight chapters.
- Bump web, service worker, and Android release metadata.

### Tests

- Add an authoring test for portal pairs, safe exits, and World 2 portal coverage.
- Add a release test for eight chapters, world IDs/names, metadata, service worker cache, Android version metadata, save-compatibility source guards, and chapter-select grouping.
- Expand storage unit tests for the new eight-chapter cap and Aurora Citadel completion derivation.
- Expand browser smoke coverage so unlocked chapter-select shows both worlds and can start chapter 6.
- Keep v1.2.3 and v1.2.4 regression tests green by allowing v1.3.0 metadata while preserving their structural assertions.

## Non-Goals

- No change to the core physics constants or character identity.
- No new dependencies, bundler, framework, network calls, analytics, ads, or server storage.
- No save schema version bump.
- No rewrite of the menu system, Android wrapper, audio bus, or existing five chapter layouts.
- No production sprite-sheet replacement in this release.
- No hidden difficulty spike; World 2 increases variety and route planning, not punishment.

## Verification Targets

```bash
npm test
npm run build:android
```

Expected APK output:

```text
dist/NiniYuan.apk
```

Manual review should confirm:

- chapter select shows two clear world headings and eight chapter cards;
- existing completed-Aurora-Citadel saves unlock chapter 6, but chapter-5-only saves do not;
- all three World 2 chapters include working paired star gates;
- star-gate travel preserves momentum/facing and never exits into solids;
- chapter 8 remains readable in Android landscape with gates, wind, moving platforms, crystals, HUD, and touch controls visible;
- visible metadata says `八大章节`, and APK badging reports `versionCode=8` / `versionName=1.3.0`.

## Acceptance Criteria

- Existing chapters 1-5 remain playable and behaviorally stable.
- World 2 contains three new handcrafted chapters with at least one portal pair each.
- The chapter-select UI clearly separates World 1 and World 2 while keeping touch/keyboard access intact.
- Existing save data loads safely under the eight-chapter release.
- `npm test` passes locally.
- `npm run build:android` produces a debug APK with the updated version metadata.

## Release Steps

1. Add World 2 level data and optional portal data shape.
2. Implement portal update, safe-exit checks, rendering, status cue, and cooldown handling.
3. Update chapter-select rendering and responsive CSS for world headings and eight cards.
4. Update save sanitization for eight chapters and Aurora Citadel completion derivation.
5. Add/expand regression tests for portals, content expansion, storage, and browser smoke.
6. Bump web/package, service worker, Android, PWA, and visible metadata to v1.3.0.
7. Update README, changelog, GDD, design docs, motion docs, Android testing notes, and this release plan.
8. Run `npm test` and fix any local regressions.
9. Run `npm run build:android` and inspect the produced APK metadata.
10. Commit the implementation and release/documentation changes locally; wait for review before pushing.

## Completion Record

### Verification

- `npm test` passed locally on 2026-05-03.
  - The full suite passed, including the new `portal-mechanics-v1_3_0` and `content-expansion-v1_3_0` suites, storage migration/compatibility coverage, docs link checks, PWA/Android wrapper checks, E2E lifecycle/save/accessibility checks, and the 6-scenario browser smoke run.
- `npm run build:android` passed locally on 2026-05-03 and produced `dist/NiniYuan.apk` (~6.0 MB).
  - APK badging: `versionCode=8`, `versionName=1.3.0`, `compileSdkVersion=36`, `min-sdk-version=23`, `targetSdkVersion=36`.
  - APK assets contain `service-worker.js` with `nini-yuan-v1.3.0-world-2-star-gates`.

### Residual Notes

- The Android build emits JDK restricted-native-access warnings from the SDK `apksigner` Conscrypt path. The build exits successfully and signs the debug APK.
- Manual Android emulator playthrough remains a release gate before store submission because it validates vendor WebView rendering, touch control ergonomics, star-gate readability, and chapter 8 density on real device profiles.
