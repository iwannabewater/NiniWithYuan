# Aesthetic & Interaction Polish Plan — v1.2.4 "Aurora Cartography"

Version scope: `v1.2.3` to `v1.2.4`
Baseline commit: `c582603`
Date: 2026-05-03
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.2.4 release is a focused aesthetic-and-interaction pass on top of the v1.2.0 Aurora Inkwash visual shell, the v1.2.1 gameplay fixes, the v1.2.2 menu-copy polish, and the v1.2.3 Starlit Whispers ambient + easter-egg layer. It does not touch gameplay, physics, level geometry, save schema, audio routing, or Android wrapper behavior. The pass adds eleven coordinated motion and detail upgrades that make the menu, the level grid, the gameplay HUD, the pause modal, the settings panel, and the canvas feedback feel like one continuously inked atlas:

1. an **atlas compass** replaces the static featured-chapter ring with a slow conic compass-rose and adds a hairline meridian rail that the level grid uses on hover so the four ordinary chapters and the featured chapter read as one map;
2. a **brand sub-aurora** brushwork stroke sweeps under the wordmark on the first paint and stills, deepening the v1.2.0 brand-reveal;
3. a **two-axis hero parallax** ties the cover-hero halo and the two character cards to fine-pointer position, with a slow breath tilt fallback on touch;
4. **HUD ink-bloom** runs a one-shot 360 ms gold/jade glow whenever the character pill or skill-state pill flips, so state changes are felt rather than read;
5. a **bossbar aurora wash** replaces the flat 3-stop fill with a slow auroral gradient and a leading-edge gleam that tracks the chapter progress;
6. a **chapter intro orchestration** layer reveals the bossbar, chapter intro card, and control tips together over 480 ms instead of three separate fades;
7. **touch action glyphs** add refined inline-SVG marks (star arrow, aurora swirl, diamond burst) above the `跳 / 技 / 弹` labels for richer presence on the Android WebView build;
8. a **modal atlas seal** adds an embossed gold seal in the modal corner and a low-opacity paper grain so pause and completion modals feel inked rather than generic;
9. **settings rune ribbons** prefix each settings row with a small gold rune (♪ / ♬ / ◐ / ✦) and a left ribbon notch;
10. a sixth **constellation hunt** easter egg unlocks a fourth letter when the player taps six ambient sparks across both side rails within fifteen seconds; the existing five surprises remain unchanged;
11. **canvas pickup feedback** adds a single-frame golden glow ring on coin/gem bursts and an italic gold-gradient float-text without altering physics, particle counts, or the FX toggle behavior.

Together with the existing v1.2.3 ambient layer, the v1.2.4 release should read as a coherent inked atlas — every empty zone occupied, every state change felt, every interaction surface signed.

## Scope

### Atlas Compass and Meridian Rail — `styles.css`

- Replace the static `.level-item.featured::before` conic gradient with a slow 18 s `compass-rotate` animation. Use `@property --compass-angle` for a typed CSS custom property when supported (`@supports (background: paint(worklet))` is not required; rely on a fallback static gradient when `@property` is not supported).
- Add a `.level-list::after` hairline meridian arc — a positioned absolute SVG-mask gradient — that traces between the four ordinary chapter cards' top-right corners. Default opacity 0; `.level-list:hover::after` raises to 0.42. The arc respects reduced-motion (no fade).
- Add a four-point gold compass star inside the featured ring, drawn with two `linear-gradient` strokes so it matches the existing inline-SVG-free aesthetic.
- Pause the rotation under `prefers-reduced-motion: reduce`.

### Brand Sub-Aurora Brushwork — `styles.css`

- Add a `.brand::after` element absolutely positioned under the wordmark at `top: 100%`, height 6 px, with a soft `radial-gradient` brushwork (`gold → rose → jade → cyan`) and an `aurora-sweep` keyframe that runs once 1400 ms ease-out forwards on first menu enter, then settles at 60 % horizontal and 40 % opacity.
- Use `animation-delay: 220 ms` so it follows the existing 1100 ms `brand-reveal` rather than competing with it.
- Hidden under `prefers-reduced-motion: reduce`.

### Two-Axis Hero Parallax — `src/render/cursor-trail.js` and `styles.css`

- Extend the existing `pointermove` handler on `.menu-heroes` to also write `--mx` (-1 to 1) and `--my` (-1 to 1) custom properties on the heroes block, throttled to 60 fps via `requestAnimationFrame`.
- Add transforms `.nini-hero` translates `calc(var(--mx, 0) * 6px) calc(var(--my, 0) * -4px)` and `.yuan-hero` translates the inverse on x for a counter-rotating depth feel; both retain the existing static rotation.
- On `(hover: none) and (pointer: coarse)` add a 7 s `hero-breath` keyframe that does a 0.5 deg ↔ -0.5 deg tilt loop for a subtle living feel without parallax.
- Pause both under reduced-motion.

### HUD Ink-Bloom — `styles.css` and `src/render/hud.js`

- Add a `hud-pulse` 420 ms keyframe that scales from 1.0 to 1.04 and back while running a `box-shadow` warm/cool flash.
- Expose a small `pulseHudPill(el)` helper from `src/render/hud.js` that toggles a `.pulse` class for one animation cycle (uses `animationend` to remove).
- Wire it into `src/game.js` `updateHud` for the **first frame** that `.cooling` flips on and off on the skill-state pill, and for the first frame that `hudCharacter` text content actually changes (cached compare). This adds three lines and one cached `string` to game.js, no logic change.
- Reduced motion replaces the keyframe with a static color-flip identical to the 50 % keyframe stop.

### Bossbar Aurora Wash — `styles.css`

- Replace the flat `linear-gradient(90deg, …)` on `.bossbar span` with a layered fill: base aurora gradient (`cyan → gold → rose`) plus a leading-edge `radial-gradient` pseudo gleam that sits at the 100 % end of the fill via `::after` and a 6 s `bossbar-shimmer` keyframe.
- The gleam's intensity is controlled by `--gleam-opacity` and is forced to 0 under reduced-motion. Width is still `transition: width var(--d-base) var(--ease-out)` — no game.js change.

### Chapter Intro Orchestration — `styles.css`

- Use `body:has(.chapter-intro.active) .bossbar` and `body:has(.chapter-intro.active) #controlTips` to delay-stagger the bossbar (0 ms), chapter intro (60 ms), and control tips (160 ms) on entry only.
- The exit fade is unchanged so existing tests that check `.chapter-intro.active` toggles still hold.
- Under reduced-motion, the staggers collapse to zero.

### Touch Action Glyphs — `styles.css` and `index.html`

- Add three CSS-rendered glyph marks via `::before`-positioned inline-SVG `mask-image` declarations (no DOM changes, keeps `aria-label="跳跃|技能|发射"` invariant). The mask uses inline `data:image/svg+xml,<svg>…</svg>` so no new asset file is added and the service worker cache list does not change.
- The touch-btn label `跳 / 技 / 弹` is moved to a `.touch-btn-label` span via a small CSS-only adjustment that uses `display: grid; grid-template-rows: 1fr auto;` so the glyph rises and the label stays anchored. The text content stays the same so accessibility tests remain green.
- Glyph color matches the existing button gradient so they read as raised emblems.

### Modal Atlas Seal — `styles.css`

- Augment the existing `.modal-card::before` notches with a `.modal-card::after` SVG-mask that draws a 64 px gold seal in the lower-right corner with a tiny calligraphic `源 · 妮` ligature.
- Add a paper-grain noise via a SVG-data-URL `feTurbulence` mask at 4 % opacity layered into the existing `linear-gradient` background. Capped at 2 KB encoded.
- The seal pulses subtly via a 9 s `seal-breathe` keyframe; reduced-motion stills it.

### Settings Rune Ribbons — `styles.css` and `index.html`

- Add `data-rune="♪|♬|◐|✦"` to each `.settings-list label` (HTML edit, four attributes only — no new IDs, no removed text). The CSS reads the attr and renders it as a gold rune in a 28×28 left chip with a hairline ribbon stub leading into the row.
- Range/checkbox layout, IDs, names, and existing `for` linkage are unchanged.

### Sixth Easter Egg — Constellation Hunt — `src/render/easter-eggs.js` and `styles.css`

- Make the existing 6 `.ambient-spark` elements clickable on fine-pointer devices (skip on coarse pointer to keep mobile UX clean): each spark gets a `pointerdown` listener.
- A spark click adds a `.ambient-spark.lit` class for 1.4 s and tracks a small "found this index" set scoped per session. If all 6 are found within 15 s of the first click, open `SECRET_LINES[3]` (a new fourth letter) and `flashHeart`.
- Reset the session set after 15 s of inactivity to avoid soft-locks.
- The fourth letter copy is a Yuan-to-Nini line tied to the constellation theme. Hidden under coarse-pointer environments so the existing five surprises remain the public surface on phones.

### Canvas Pickup Glow + Float-Text Polish — `src/game.js`

- In the existing `burst()` function for coin/gem pickups, when the `color` argument matches the gold/cyan tones used for `coin/gem`, push **one additional non-colliding particle** with a wider radius (10 px) and faster fade (0.18 s life) tagged `glow: true`. In `renderParticles()`, particles with `glow: true` are drawn with `globalCompositeOperation = "lighter"` and double-radius with a soft radial gradient stroke. Falls back gracefully when `save.settings.fx` is off (no glow particle pushed).
- In `renderFloatTexts()`, draw the text twice — once with a low-alpha gold gradient stroke offset by 1 px (italic), once with the existing solid color — for a subtle gilded edge. No new fields on `floatTexts`.
- Both changes are guarded by `save.settings.fx` so the FX toggle remains the user's control.

### Versioning, Cache, Manifest, Android, Service Worker

- Bump `package.json` and `package-lock.json` to `1.2.4`.
- Bump Android `versionCode` to 7 and `versionName` to `1.2.4` in `android/app/src/main/AndroidManifest.xml`.
- Bump the service worker cache to `nini-yuan-v1.2.4-aurora-cartography`.
- The PWA manifest description copy is already correct from v1.2.3 — leave it untouched.

### Tests

- Add `tests/aesthetic-polish-v1_2_4.js` to the run-all suite. Assertions:
  - `package.json`, `package-lock.json` versions are `1.2.4`;
  - service worker cache string is `nini-yuan-v1.2.4-aurora-cartography`;
  - Android `versionCode="7"` and `versionName="1.2.4"`;
  - presence of `compass-rotate`, `aurora-sweep`, `hud-pulse`, `bossbar-shimmer`, `seal-breathe`, `hero-breath` keyframes in `styles.css`;
  - presence of `.level-list::after` meridian rail rule, `.bossbar span::after` gleam rule, `.modal-card::after` seal rule;
  - reduced-motion clauses disable `compass-rotate`, `aurora-sweep`, `hud-pulse`, `bossbar-shimmer`, `seal-breathe`, `hero-breath`;
  - settings labels carry `data-rune` attributes;
  - `easter-eggs.js` exposes a `bindConstellationHunt` function and references `SECRET_LINES[3]`;
  - `cursor-trail.js` writes `--mx` / `--my` custom properties (regex on the source).
- The existing `tests/menu-polish-v1_2_3.js` is renamed to `tests/menu-polish-v1_2_3-and-up.js` only if a version-string update is needed; otherwise the existing assertion block is updated in place to allow either `v1.2.3-starlit-whispers-r3` (legacy) or the v1.2.4 cache key, and to bump the pinned version strings to `1.2.4` while keeping all the structural patterns. Same applies to the Android manifest pin.

### Documentation

- Add a `v1.2.4` entry to `CHANGELOG.md`.
- Update `README.md` headline, summary line, and the test description sentence to reference v1.2.4 and Aurora Cartography.
- Extend `docs/DESIGN.md` with three new component sections: Atlas Compass, Brand Sub-Aurora, Touch Action Glyphs, Modal Atlas Seal, Settings Rune Ribbons; and the new tokens introduced.
- Extend `docs/MOTION.md` signature-micro-interactions table with the six new entries (compass rotation, aurora sweep, HUD pulse, bossbar shimmer, modal seal breathe, hero breath/parallax) and the reduced-motion entries.
- Update `docs/GDD.md` headline to v1.2.4 and add a one-paragraph aesthetic-pass note.
- Update `docs/ANDROID_TESTING.md` to add four new manual-smoke checks (compass rotation, hero parallax, modal seal pulse, glyph touch buttons).

## Non-Goals

- No gameplay, physics, level, save, audio, controller, or Android native behavior change.
- No new dependencies, no bundler, no JS framework introduction.
- No new image assets — every new visual is CSS, inline SVG-data-URL, or a CSS-driven mask.
- No DOM IDs, button text, accessibility labels, or selectors that the existing test suite or Android wrapper relies on are renamed or removed.
- No changes to `src/game.js` querySelector graph, the save schema IDs, or the existing render/touch behavior.
- No retroactive change to v1.2.3 tests beyond version-string and cache-name updates.

## Verification Targets

```bash
npm test
npm run build:android
```

Expected APK output:

```text
dist/NiniYuan.apk
```

Manual review should re-open the main menu, the level-select screen, and a single gameplay session, then confirm:

- the featured chapter ring rotates slowly clockwise; the four ordinary chapter cards reveal a hairline meridian arc on hover that connects them and the featured card;
- the brand wordmark gains a soft gold/rose/jade aurora brushwork stroke under it on first paint, then stills;
- moving a fine pointer over the cover hero pushes the two characters in counter-balanced parallax; on touch devices the heroes do a slow 7 s breath tilt instead;
- changing character (via select screen) flashes a single soft gold pulse on the HUD character pill on the next gameplay frame; a skill becoming ready/cooling flashes a single jade↔gold pulse on the skill pill;
- the bossbar fill shows a slow aurora wash with a leading-edge gleam during play;
- starting any chapter shows the bossbar, chapter intro, and control tips arrive in a coordinated stagger rather than simultaneously;
- the touch action buttons show a glyph mark above the existing label, and the labels are still announced as `跳跃 / 技能 / 发射`;
- the pause modal shows a small gold atlas seal in the lower-right corner that breathes slowly, plus a faint paper grain across the card;
- the settings labels are prefixed with rune chips (♪ / ♬ / ◐ / ✦);
- clicking six ambient sparks across both rails within fifteen seconds opens a fourth letter modal with a heart;
- collecting a coin shows a brief gold halo on the burst and gilded float-text;
- `prefers-reduced-motion: reduce` pauses every new keyframe; `prefers-contrast: more` increases hairlines as before;
- the Android APK builds with `versionCode=7` and `versionName=1.2.4` and the WebView gameplay surface shows the new touch glyphs.

## Acceptance Criteria

- All v1.2.3 acceptance criteria continue to hold.
- The browser-smoke `menu polish layout` scenario continues to pass without modification: hero star-chart pattern, ambient layer, ambient strip visibility, ambient z-index above shell, cursor-trail layer over the menu surface, no text selection on title/buttons, gold filled-star color, gold best-time value, four-card left-edge alignment, and the 520/short-and-full Konami easter eggs all stay green.
- The five v1.2.3 hidden surprises stay reachable; the new sixth surprise is opt-in via fine pointer only and does not interfere on touch.
- `prefers-reduced-motion: reduce` disables every new keyframe (compass, aurora-sweep, hud-pulse, bossbar-shimmer, seal-breathe, hero-breath) and stops the constellation-hunt highlight animation; touch-button glyphs are still visible (no animation).
- Existing axe scans on menu, characters, levels, settings, and HUD report no new serious or critical WCAG 2A/2AA violations. The new constellation-hunt sparks expose `aria-hidden="true"` because the surprise is purely visual; the touch-glyph mask is decorative-only.
- `npm test` passes locally (all 22 suites including the new `aesthetic-polish-v1_2_4`).
- `npm run build:android` produces `dist/NiniYuan.apk` with `versionCode=7` and `versionName=1.2.4` and the cache key updated.

## Release Steps

1. Implement `styles.css` token additions, the new keyframes, and the per-component CSS.
2. Implement the `src/render/cursor-trail.js` parallax extension and the `src/render/easter-eggs.js` constellation-hunt + fourth letter.
3. Add the `pulseHudPill` helper and the two `game.js` hooks for the HUD pulse.
4. Add the canvas glow + gilded float-text in `game.js` (FX-toggle gated).
5. Add `data-rune` attributes to the four settings labels in `index.html`.
6. Bump version metadata, service worker cache, and Android `versionCode/versionName`.
7. Update `tests/menu-polish-v1_2_3.js` version pins to allow the new cache key + version string, and add `tests/aesthetic-polish-v1_2_4.js`. Wire it into `tests/run-all.js`.
8. Run `npm test` and fix any regression locally.
9. Update docs and changelog.
10. Run `npm run build:android` to sync the WebView assets and produce `dist/NiniYuan.apk`.
11. Stage two coherent commits locally: one for the visual + interaction polish (`feat(ui): aurora cartography polish v1.2.4`) and one for docs/version/cache (`chore(release): v1.2.4 docs, version, cache, and android metadata`).
12. Wait for review approval before pushing to `origin/main`.

## Completion Record

### Verification

- `npm test` passed locally on 2026-05-03.
  - All 22 suites green: `physics-balance`, `mechanics-balance`, `gameplay-bugfix`, `unit/storage.test`, `character-atlas`, `docs-links`, `render-touch-polish`, `menu-polish-v1_2_3` (now version-flexible), the new `aesthetic-polish-v1_2_4`, `ci-workflows`, `android-wrapper`, `audio-bgm`, `pwa-assets`, the four `e2e/*` suites (lifecycle, save-tampering, pwa-registration, accessibility), and the 6-scenario `browser-smoke`.
- `npm run build:android` passed locally on 2026-05-03 and produced `dist/NiniYuan.apk` (~6.0 MB).
  - APK badging: `versionCode=7`, `versionName=1.2.4`, `compileSdkVersion=36`, `min-sdk-version=23`, `targetSdkVersion=36`.
  - APK assets contain the updated `service-worker.js` cache name `nini-yuan-v1.2.4-aurora-cartography`, the v1.2.4 `assets/styles.css` with the new compass / aurora-sweep / hud-pulse / bossbar-shimmer / seal-breathe / spark-lit / hero-breath / bossbar-rise / tips-rise keyframes, the extended `assets/src/render/cursor-trail.js` with `attachHeroParallax`, the extended `assets/src/render/easter-eggs.js` with `bindConstellationHunt` and the fourth letter, and the extended `assets/src/render/hud.js` with `pulseHudPill`.
- A local headless Chromium probe confirmed the live page writes `--mx` / `--my` on pointer move, plays `aurora-sweep` on `.brand::after`, plays `compass-rotate` on `.level-item.featured::before`, plays `seal-breathe` on `.modal-card::after`, exposes the four `data-rune` attributes on the settings rows, and exposes both `NiniYuanCursorTrail.attachHeroParallax` and `NiniYuanLove.bindConstellationHunt` on `window`.

### Residual Notes

- The meridian rail (`.level-list::after`) is gated by `:hover` on a fine pointer and intentionally stays hidden on coarse-pointer / touch viewports. This means the rail is invisible on Android. The featured-chapter compass and meridian dots stay accessible via the existing focused/keyboard chapter pickers, so the rail is purely decorative.
- The constellation-hunt easter egg gates on `(hover: hover) and (pointer: fine)`. Touch users continue to interact with the existing five v1.2.3 surprises; the sixth surprise is fine-pointer only by design so phones do not reveal a click target on the decorative ambient sparks.
- The `tests/menu-polish-v1_2_3.js` version pins were widened to accept v1.2.3 or v1.2.4 metadata so the v1.2.3 structural assertions stay green during and after the v1.2.4 release.
- Manual Android emulator validation remains part of the release gate for store submission because it verifies vendor WebView behavior and device-specific rendering of the new touch glyph masks, the modal atlas seal, and the bossbar shimmer.
