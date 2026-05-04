# Game-Feel and Sound-Design Polish Plan — v1.5.0

Version scope: `v1.4.0` to `v1.5.0`
Baseline commit: `7b46470`
Design spec: `docs/superpowers/specs/2026-05-04-v1_5_0-game-feel-design.md`
Date: 2026-05-04
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.5.0 release is the first slice of the v1.5.x quality arc. It improves moment-to-moment feel and sound design while preserving the existing 15 chapters, fixed-step physics, two-character controls, local-only save model, Android WebView wrapper, PWA shell, and Aurora Inkwash design system.

The release adds hit-stop, Yuan dash anticipation, landing dust, screen-shake clamping, BGM autoplay retry, respawn veil, camera lookahead, and a named Web Audio cue table. It deliberately does not add performance pooling, assist mode, portrait UI redesign, journal/codex features, new content, new dependencies, or a save migration.

## Scope

### Gameplay Feel

- Add max-stacked, capped hit-stop for stomp, projectile hit, hurt, crystal break, and Yuan dash anticipation.
- Add hard-landing dust puffs gated by the existing visual effects setting.
- Add camera lookahead that stays within level bounds and resets on portal, respawn, and visibility changes.
- Add shake clamping for mobile landscape and reduced-motion.
- Add a short respawn ink veil for non-lethal fall recovery.

### Audio

- Add a 16-entry semantic cue table in `src/core/audio.js`.
- Replace gameplay `beep(freq, duration)` call sites with `audioBus.cue(name)`.
- Keep the low-level `beep()` helper for compatibility.
- Add BGM autoplay retry listeners that survive pre-game gestures and self-remove after successful playback.

### Compatibility

- Keep `SAVE_SCHEMA_VERSION = 2`.
- Keep all physics constants pinned: jump tuning, gravity, dash speed/distance, glide duration, coyote time, jump buffer, ammo regen, portal cooldown, and phase period.
- Keep the no-bundler, vanilla JS runtime.

### Release Metadata

- Bump package and lockfile to `1.5.0`.
- Bump Android to `versionCode=11`, `versionName=1.5.0`.
- Bump service worker cache to `nini-yuan-v1.5.0-game-feel`.
- Add `src/render/game-feel.js` and `src/render/respawn-veil.js` to cached assets.

## Tests

- Add `tests/gamefeel-v1_5_0.js` for hit-stop math, cap, take-max behavior, reset, reduced-motion no-op, camera lookahead bounds, shake clamp matrix, landing puff gating, cue table completeness, mock Web Audio graph shape, and physics constant pins.
- Extend `tests/audio-bgm.js` for BGM autoplay retry attachment, idempotency, and listener removal after success.
- Extend `tests/browser-smoke.js` with a blocked-BGM retry scenario.
- Update version/cache metadata guards in v1.2.3, v1.2.4, v1.4.0, and typography/copy regression tests.
- Keep content, portal, phase-tide, storage, accessibility, PWA, Android wrapper, and lifecycle tests green.

## Verification Targets

```bash
npm test
npm run build:android
```

The Android build should produce `dist/NiniYuan.apk` with `versionCode=11`, `versionName=1.5.0`, `compileSdkVersion=36`, `min-sdk-version=23`, and `targetSdkVersion=36`.

## Manual Review Checklist

- Yuan dash anticipation reads as a short launch beat, not a control delay.
- Stomp impact feels weighted without making rapid play sluggish.
- Projectile hits and crystal breaks register clearly.
- Hurt reaction is readable and not annoying during rapid failure.
- Small drops do not trigger landing dust; hard landings do.
- Camera lookahead helps fast routes in chapters 5, 10, and 15 without hiding hazards.
- Portal and respawn transitions do not lurch the camera.
- Respawn veil reads as a beat rather than a stuck overlay.
- BGM starts after a retry gesture when the initial attempt is blocked.
- Mobile landscape shake is less harsh than desktop.
- Reduced-motion disables hit-stop and visible lookahead while preserving functional audio.

## Completion Notes

- Implementation keeps `src/game.js` edits localized to call-site wiring and lifecycle resets.
- The BGM retry design was corrected during implementation: pre-game pointer/keyboard events now keep listeners attached because the gameplay-start pointer event fires before the menu click handler requests BGM.
- `npm test` passed locally on 2026-05-04.
  - Includes syntax checks, physics/mechanics/gameplay guards, storage unit tests, character atlas, docs links, render/touch polish, v1.2.3/v1.2.4 UI regression guards, v1.4.0 content/portal/phase-tide validation, typography/copy glyph coverage, CI/Android wrapper/PWA/audio checks, the new v1.5.0 game-feel suite, E2E lifecycle/save/PWA/accessibility suites, and the 7-scenario browser smoke run.
- `npm run build:android` passed locally on 2026-05-04.
  - Output: `dist/NiniYuan.apk`.
  - APK badging: `versionCode=11`, `versionName=1.5.0`, `compileSdkVersion=36`, `min-sdk-version=23`, `targetSdkVersion=36`.
- Build outputs (`build/`, `dist/`, `android/app/src/main/assets/`) remain ignored and must not be committed.
