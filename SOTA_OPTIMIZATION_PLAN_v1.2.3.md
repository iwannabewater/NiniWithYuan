# Aesthetic & Interaction Polish Plan — v1.2.3 "Starlit Whispers"

Version scope: `v1.2.2` to `v1.2.3`
Baseline commit: `bf0f8a1`
Date: 2026-05-03
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.2.3 release is a small menu-surface aesthetic-and-interaction pass. It keeps the v1.2.0 visual shell, the v1.2.1 gameplay fixes, the v1.2.2 menu polish, the v1.1.0 content baseline, the save schema, audio routing, screen flow, chapter content, physics, and Android WebView gameplay behavior intact. The scope is limited to four presentation issues:

- restore the v1.2.0 gold accent that was lost from the chapter cards in v1.2.2 (filled stars and best-time value);
- fill the previously empty viewport zones to the left, right, and below the menu panel with a tasteful ambient star-atlas layer;
- introduce a soft pointer stardust trail on the cover hero region and the brand title for fine-pointer desktop users so the first viewport feels alive;
- add a small set of discoverable Yuan-to-Nini surprises so the project carries a hidden personal layer beyond the public game shell.

## Scope

### Chapter Card Score Line — `src/render/hud.js` and `styles.css`

- Split `.level-meta` from a single span of `★★★ · 最佳 mm:ss` into:
  - `<span class="level-stars">` containing three `<span class="star filled|empty">` glyphs with `aria-label="星级 N / 3"`;
  - a thin `<span class="level-sep">·</span>` separator;
  - `<span class="level-best">` containing `<span class="level-best-label">最佳</span>` and `<strong class="level-best-value">mm:ss</strong>`.
- Style filled stars with `--c-gold-200` plus a gold halo text-shadow; style empty stars at low ivory opacity; style the best-time value in tabular gold; locked chapters drop the gold tint to a muted ivory tone.
- Keep `.level-copy`, `.level-meta`, the buttons-as-cards pattern, and the v1.2.2 left-edge alignment unchanged so the existing browser-smoke `level-meta` and `level-copy` assertions still hold.

### Ambient Side Layer — `index.html` and `styles.css`

- Append three decorative blocks to the document, all `aria-hidden="true"` and outside `<main id="shell">`:
  - `.ambient.ambient-left` with vertical streamer, three calligraphic rune marks, three sparks;
  - `.ambient.ambient-right` with the same plus a small connected six-star constellation glyph in inline SVG;
  - `.ambient-strip` footer placard with a gold star mark, a version-and-scope chip, a rotating star-quote line, and a copyright credit.
- Default the layer to `opacity: 0` and reveal it only when at least one menu screen is active via `body:has(.screen.active)` so the layer disappears during gameplay. Hide the side rails entirely on `(pointer: coarse)` and on viewports under 900 px; reduce the strip on landscape mobile.
- Pause all decorative ambient animations under `prefers-reduced-motion: reduce`.

### Pointer Stardust Trail — `src/render/cursor-trail.js` and `styles.css`

- Add a small `NiniYuanCursorTrail` script that hooks `pointermove` on `.menu-heroes` and on the brand `<h1>` only.
- Spawn at most one `.cursor-spark` particle every 28 ms with up to 32 active particles; each particle drifts up 22 px and fades over 720 ms via the `cursor-spark-fade` keyframe.
- Particles cycle through gold, rose, and jade tones to match Yuan and Nini's palette accents.
- Skip activation entirely on `(hover: none)` or `(pointer: coarse)` and on `prefers-reduced-motion: reduce`. The trail self-cleans by removing each particle on `animationend`.

### Hidden Yuan-to-Nini Easter Eggs — `src/render/easter-eggs.js` and `styles.css`

- Add a `NiniYuanLove` script that registers six discoverable triggers without changing any visible UI:
  1. **Konami sequence** `↑↑↓↓←→←→ N Y` opens a centered letter modal (`.love-letter`) with a hand-signed message and triggers the constellation heart.
  2. **Number sequence** `5 → 2 → 0` opens a second letter modal.
  3. **Long-press** on the brand block (`.brand`) for 1.5 s shows a brief "Yuan ❤ Nini" toast and the constellation heart.
  4. **Tap counter** on the brand `<h1>`: three taps shows a rotating star-quote toast; seven taps opens a third letter modal.
  5. **Invisible cover gem** appended into `.menu-heroes` reveals on hover and triggers a quote toast plus the constellation heart on click.
  6. **Calendar trigger** on `5/20` and `12/12` automatically shows the constellation heart and a celebratory toast.
- The shared `flashHeart` helper renders an inline-SVG heart filled with a rose-gold linear gradient and beats via the `love-heart-beat` keyframe.
- The shared `showToast` helper renders a centered top-bar pill that fades in and out for the requested duration.
- Rotate the visible footer-strip quote line on each load by selecting one of seven star-themed lines.

### Versioning, Cache, Manifest, Android

- Bump `package.json` and `package-lock.json` to `1.2.3`.
- Bump Android `versionCode` to 6 and `versionName` to `1.2.3`.
- Bump the service worker cache to `nini-yuan-v1.2.3-starlit-whispers` and add the two new render scripts to the asset list.
- Update the install-prompt manifest description from the legacy platform-jump phrase to the same star-atlas adventure copy used in the cover.

### Documentation

- Update `README.md` headline to v1.2.3 with a one-line summary of the aesthetic-and-interaction pass.
- Add a `v1.2.3` entry to `CHANGELOG.md`.
- Extend `docs/DESIGN.md` with the new "Ambient Side Layer" component section and the v1.2.3 chapter-card score-line treatment, plus the four new keyframes.
- Extend `docs/MOTION.md` with three new signature micro-interactions (ambient drift, cursor spark, easter-egg surfaces) and reduced-motion entries.
- Update `docs/GDD.md` and `docs/ANDROID_TESTING.md` to reference v1.2.3 and to add the new visual smoke checks.

## Non-Goals

- No gameplay, physics, level, save, audio, controller, or Android native behavior change.
- No new dependencies, no bundler, no JS framework introduction.
- No new art assets or generated images; all new visuals are CSS, inline SVG, or DOM-and-CSS particles.
- No changes to the `src/game.js` querySelector graph, save schema IDs, button text, accessibility labels, or test invariants pinned by the existing suite.

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

- chapter cards show gold filled stars, muted empty stars, and a gold tabular best-time value while keeping the v1.2.2 left-aligned copy;
- the empty viewport zones to the left, right, and below the menu panel are now occupied by a low-opacity ambient layer that disappears as soon as gameplay begins;
- on desktop, moving the cursor over the cover and the brand title leaves a brief gold/rose/jade stardust trail that does not affect gameplay or persist into the HUD;
- triggering any one of the six easter eggs surfaces a letter modal, a heart, or a toast and dismisses cleanly without affecting save data or audio routing;
- the Android APK builds with the new `versionCode` 6 and `versionName` 1.2.3 and the WebView gameplay surface is visually identical to v1.2.2.

## Acceptance Criteria

- All v1.2.2 acceptance criteria continue to hold.
- `level-copy` and `level-meta` classes remain present on chapter cards; the four-card left-edge alignment invariant from `tests/browser-smoke.js` "menu polish layout" still passes.
- `body:has(.screen.active)` reveal works in current Chromium (web) and Android-36 WebView; older browsers degrade gracefully by leaving the ambient layer hidden.
- `prefers-reduced-motion: reduce` disables the cursor trail, pauses the ambient animations, and stops the easter-egg heartbeat.
- Accessibility: ambient and easter-egg DOM is `aria-hidden` or carries an explicit `role="dialog"` with `aria-modal` and a focusable close button; existing axe scans on menu, characters, levels, settings, and HUD report no new serious or critical WCAG 2A/2AA violations.

## Release Steps

1. Implement `src/render/hud.js` chapter-card split, `styles.css` token additions, the ambient DOM in `index.html`, the cursor-trail script, and the easter-egg script.
2. Bump version metadata, service worker cache, and manifest description.
3. Run `npm test` and fix any regression locally.
4. Update docs and changelog.
5. Run `npm run build:android` to sync the WebView assets and produce `dist/NiniYuan.apk`.
6. Stage two coherent commits locally: one for visual polish + ambient + easter-eggs (`feat(ui): starlit whispers polish v1.2.3`) and one for docs/version/cache (`chore(release): v1.2.3 docs and version`).
7. Wait for review approval before pushing to `origin/main`.

## Completion Record

### Verification

- `npm test` passed locally on 2026-05-03.
  - Includes `physics-balance`, `mechanics-balance`, `gameplay-bugfix`, `unit/storage.test`, `character-atlas`, `docs-links`, `render-touch-polish`, the new `menu-polish-v1_2_3`, `ci-workflows`, `android-wrapper`, `audio-bgm`, `pwa-assets`, all four `e2e/*` suites, and the expanded `browser-smoke` (6 scenarios) which now also asserts the gold filled-star color, gold best-time value, ambient streamer / strip / constellation presence, ambient z-layer above the canvas shell, visible cursor-trail particles on a fine pointer, and functional 520/Konami keyboard surprises.
- `npm run build:android` passed locally on 2026-05-03 and produced `dist/NiniYuan.apk` (~6.2 MB).
  - APK badging: `versionCode=6`, `versionName=1.2.3`, `compileSdkVersion=36`, `min-sdk-version=23`, `targetSdkVersion=36`.
  - APK assets contain the updated `service-worker.js` cache name `nini-yuan-v1.2.3-starlit-whispers`, the ambient DOM in `assets/index.html`, and both `assets/src/render/cursor-trail.js` and `assets/src/render/easter-eggs.js`.

### Residual Notes

- Manual Android emulator validation remains part of the release gate for store submission because it verifies vendor WebView behavior and device-specific rendering of the ambient layer + easter-egg surfaces.
- `body:has(.screen.active)` is used to gate ambient visibility, and `body:has(.hud.active)` forces it off with no fade delay once gameplay begins. Modern Chromium and current Android-36 WebView support `:has`. Older WebView builds gracefully degrade to "no ambient layer," which keeps gameplay unaffected. The ambient layer must sit above the full-screen canvas shell and below the active menu panels.
- The pointer stardust trail is intentionally desktop-only via `(hover: hover) and (pointer: fine)` and is fully off under reduced-motion to keep the WebView gameplay surface untouched. Its rendering layer must cover the viewport above the active menu panel so particles are not hidden by the panel/canvas stacking order.

### Post-Review Correction

- Root cause found during the v1.2.3 review: the ambient DOM existed and its opacity toggled on, but `z-index: 0` placed it behind the full-screen `#shell`/canvas stack; cursor particles were created but their layer sat below the active menu surface; the 520 and Konami letter indices were reversed in `src/render/easter-eggs.js`.
- Fix applied: ambient now uses `z-index: 2`, `.cursor-trail` is a fixed full-viewport layer at `z-index: 9`, `5 → 2 → 0` opens the first letter, and `↑↑↓↓←→←→ N Y` opens the second letter plus the rose-gold heart.
- Regression coverage added to `tests/browser-smoke.js` and `tests/menu-polish-v1_2_3.js` so the review checks real pointer movement, real keyboard input, layer ordering, and letter order instead of only checking that scripts and DOM nodes exist.
