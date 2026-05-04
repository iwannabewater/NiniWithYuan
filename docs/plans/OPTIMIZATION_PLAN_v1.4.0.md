# World 2 Completion and World 3 Phase-Tide Plan — v1.4.0

Version scope: `v1.3.1` to `v1.4.0`
Baseline commit: `a1d854f`
Design spec: `docs/superpowers/specs/2026-05-04-world-3-phase-tide-design.md`
Date: 2026-05-04
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.4.0 release expands `Nini & Yuan` from 8 chapters to 15 chapters while preserving the existing fixed-step physics, two-character controls, local-only save model, Android WebView wrapper, PWA shell, and Aurora Inkwash design system.

The release completes World 2 with two additional star-gate chapters and opens World 3 with five phase-tide chapters. The new mechanic is intentionally narrow: phase-tagged platforms, pickups, and hazards alternate between two readable star-tide phases. No framework, bundler, dependency, save key, or schema-version migration is introduced.

## Scope

### Gameplay

- Add 第九章 星桥潮汐 and 第十章 群岛星核 to World 2.
- Add 第十一章 相位浅滩 through 第十五章 星潮王庭 to World 3.
- Add `phaseTide` level metadata and phase-tagged object support.
- Render inactive phase objects as ghosted mirror silhouettes.
- Surface the current phase in the HUD status pill.
- Preserve star-gate runtime semantics and portal safe-exit checks.

### Compatibility

- Keep `SAVE_SCHEMA_VERSION = 2`.
- Increase default level count to 15.
- Preserve chapter 5 completion to chapter 6 unlock compatibility.
- Add chapter 8 completion to chapter 9 unlock compatibility.

### UI and Visuals

- Keep grouped chapter select.
- Add the third world heading `第三星域 星潮镜域`.
- Keep current count-free visible copy such as `多世界章节`.
- Regenerate local LXGW WenKai 500/700 subsets from the expanded runtime text surface.

### Release Metadata

- Bump package and lockfile to `1.4.0`.
- Bump Android to `versionCode=10`, `versionName=1.4.0`.
- Bump service worker cache to `nini-yuan-v1.4.0-world-3-phase-tide`.

## Tests

- Update content expansion tests for 15 chapters and 3 worlds.
- Update portal tests for 5 World 2 portal chapters and 2 World 3 portal/phase hybrids.
- Add phase-tide tests for World 3 chapter data, phase values, in-bounds objects, runtime hooks, and ghost rendering.
- Update storage tests for the 15-chapter cap and chapter 8 to 9 compatibility.
- Update browser smoke for three world headings and chapter 11 startup.
- Update typography tests and font subsets for all new runtime Chinese glyphs.

## Verification Targets

```bash
npm test
npm run build:android
```

If the Android SDK is unavailable in the local environment, record the blocker and leave the web/test verification complete.

## Completion Notes

### Verification

- `npm test` passed locally on 2026-05-04.
  - Includes syntax checks, physics/mechanics/gameplay guards, storage unit tests, character atlas, docs links, render/touch polish, v1.2.3/v1.2.4 UI regression guards, v1.4.0 content expansion, v1.4.0 phase-tide validation, typography/copy glyph coverage, CI/Android wrapper/PWA/audio checks, E2E lifecycle/save/PWA/accessibility suites, and the 6-scenario browser smoke run.
- `npm run build:android` passed locally on 2026-05-04.
  - Output: `dist/NiniYuan.apk` (~5.7 MB).
  - APK badging: `versionCode=10`, `versionName=1.4.0`, `compileSdkVersion=36`, `min-sdk-version=23`, `targetSdkVersion=36`.

### Residual Notes

- Build outputs (`build/`, `dist/`, `android/app/src/main/assets/`) remain ignored and must not be committed.
- The phase-tide implementation is intentionally data-driven and narrow. Future phase portals, enemies, or route-switching systems should go through a separate design pass instead of being added ad hoc.
