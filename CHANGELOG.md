# Changelog

## v1.3.0

- Added World 2, **星门群岛**, with three handcrafted chapters: 第六章 星门浅湾, 第七章 回环灯塔, and 第八章 星环温室. The original five chapters are now grouped as World 1, **第一星域 破碎星图**.
- Added paired star gates as a World 2 traversal mechanic. Gates preserve velocity, facing, character state, health, ammo, and collection progress, apply a short cooldown plus an exit-gate lock, and use safe-exit authoring checks to avoid placing the player inside solids or outside level bounds.
- Expanded chapter-select rendering with world headings and a denser two-column atlas layout while preserving the v1.2.4 compass, meridian rail, locked-card treatment, keyboard focus, and touch behavior.
- Kept save schema version 2 and added compatibility logic for the eight-chapter cap. Completed Aurora Citadel progress derives World 2 access; saves that only unlocked chapter 5 still require finishing chapter 5.
- Updated visible and install metadata from five chapters to eight chapters across `index.html`, `manifest.webmanifest`, README, GDD, design docs, motion docs, Android testing notes, and the release plan.
- Bumped the web package to `1.3.0`, Android `versionCode` to 8 / `versionName` to `1.3.0`, and the service worker cache to `nini-yuan-v1.3.0-world-2-star-gates`.
- Added `tests/content-expansion-v1_3_0.js` and `tests/portal-mechanics-v1_3_0.js`, expanded storage and browser smoke coverage for eight chapters, and widened v1.2.3/v1.2.4 regression tests to accept v1.3.0 release metadata.

## v1.2.4

- Replaced the static featured-chapter atlas ring with a slow rotating gold compass and added a hairline meridian rail that reveals on grid hover so the four ordinary chapters and the featured chapter read as one inked map; the featured-chapter star is upgraded to a four-point compass mark.
- Added a brand sub-aurora brushwork stroke that sweeps gold/rose/jade/cyan under the wordmark on first menu paint and then settles, deepening the v1.2.0 brushwork title reveal.
- Added two-axis pointer parallax on the cover hero region driven by a fine-pointer hook in `src/render/cursor-trail.js` (`--mx` / `--my` custom properties); touch devices receive a slow 7 s breath tilt fallback so the heroes feel alive without parallax.
- Added one-shot HUD ink-bloom pulses on the character pill and the skill-state pill, fired only when the character name or the cooling state actually flips, via a new `pulseHudPill` helper in `src/render/hud.js` and a 420 ms `hud-pulse` keyframe.
- Replaced the bossbar's flat 3-stop fill with a slow auroral wash (`bossbar-shimmer`) and added a leading-edge gleam pseudo so chapter progress feels gilded rather than mechanical.
- Added a chapter-intro orchestration layer: when `.chapter-intro.active` is on, the bossbar and control tips arrive in a coordinated 0 ms / 60 ms / 160 ms stagger via `body:has(.chapter-intro.active) …` rules.
- Added refined inline-SVG glyph marks above the `跳 / 技 / 弹` touch labels — a star-arrow for jump, an aurora swirl for skill, and a diamond burst for shoot — using mask-image data URLs so no new asset files are introduced; the existing accessibility labels and aria are unchanged.
- Added a paper grain (SVG-data-URL `feTurbulence` overlay, ~5 % opacity) and a small gold atlas seal in the lower-right corner of the pause/completion modal, breathing gently via a 9 s `seal-breathe` keyframe.
- Added gold rune chips and a hairline ribbon notch to the four settings rows via `data-rune` attributes (♪ / ♬ / ◐ / ✦) so the settings panel reads as inked stationery rather than a generic form.
- Added a sixth hidden Yuan-to-Nini surprise — the **constellation hunt**: clicking all six ambient sparks across both rails within fifteen seconds opens a fourth letter modal and flashes a heart. The hunt is fine-pointer only so the existing five surprises remain the public surface on phones.
- Added a single composite-add gold halo particle on coin and gem pickup bursts and gilded the float-text with a low-alpha italic gold underprint; both are gated by the existing `settings.fx` toggle so the FX off path is preserved.
- Bumped the web package to `1.2.4`, Android `versionCode` to 7 / `versionName` to `1.2.4`, and the service worker cache to `nini-yuan-v1.2.4-aurora-cartography`. The PWA manifest description is unchanged because the v1.2.3 copy still applies.
- Reduced-motion contract: every new keyframe is paused under `prefers-reduced-motion: reduce` (compass rotation, aurora sweep, HUD pulse, bossbar shimmer, hero breath, modal seal breathe, spark lit, chapter-intro stagger). Glyph masks remain visible because they carry no animation.
- Added `tests/aesthetic-polish-v1_2_4.js` and wired it into `tests/run-all.js`. Updated `tests/menu-polish-v1_2_3.js` so the version pins accept v1.2.4 metadata and the new cache key while keeping every structural assertion from v1.2.3 green.

## v1.2.3

- Restored gilded readability on chapter cards: filled stars now glow gold, empty stars sit muted, and the best-time value is set in tabular gold so the score line stays visible against the ink-vellum surface; the v1.2.2 left-aligned chapter-card layout is preserved.
- Added an ambient star-atlas side layer that fills the previously empty left, right, and bottom viewport zones outside the panel: drifting calligraphic rune marks, twinkling sparks, a small connected constellation glyph on the right, and a footer placard that surfaces version, save state, and a rotating star-quote line. The layer is decorative-only, hides during gameplay, and respects reduced-motion.
- Added a soft pointer stardust trail on the cover hero region and the brand title for fine-pointer desktop users; trail particles interpolate along fast pointer movement, fade and lift over ~960 ms, are capped to 56 active sparks, and are disabled on touch devices, on `(hover: none)` pointers, and under `prefers-reduced-motion`.
- Added a small set of hidden Yuan-to-Nini surprises that do not change main gameplay: a Konami-style code, a digit-sequence trigger, a long-press on the title, a tap-counter on the brand wordmark, an invisible cover gem, and a calendar trigger for two anniversary dates. Surprises produce a short letter modal, a brief constellation heart, or a transient toast.
- Post-review fix: raised the ambient and cursor-stardust layers above the full-screen canvas/menu surface, corrected the 520/Konami letter order so `5 → 2 → 0` opens the first letter and both `↑↑↓↓←→ N Y` / `↑↑↓↓←→←→ N Y` open the second letter plus heart, and expanded the browser regression to exercise the real pointer and keyboard paths.
- Post-review interaction refinement: disabled text selection/callout on rapid-click and long-press targets such as the title, menu buttons, and Android touch controls while leaving ordinary descriptive copy selectable.
- Bumped the web package to `1.2.3`, Android `versionCode` to 6 / `versionName` to `1.2.3`, the service worker cache to `nini-yuan-v1.2.3-starlit-whispers-r3`, and the install-prompt manifest description from the legacy platform-jump phrasing to the star-atlas adventure copy used in the cover.

## v1.2.2

- Updated the main-menu subtitle from the awkward platform-jump phrasing to a shorter star-atlas adventure line across HTML metadata and the visible cover.
- Fixed chapter-card text alignment by giving level cards explicit left-aligned grid content instead of inheriting the global button centering behavior.
- Added static star-chart detail to the cover hero area to make the first screen feel richer while keeping the WebView-friendly no-new-asset approach.
- Bumped the web package to `1.2.2`, Android `versionCode` to 5 / `versionName` to `1.2.2`, and the service worker cache to `nini-yuan-v1.2.2-menu-polish`.

## v1.2.1

- Fixed chapter 3 and chapter 5 wind fields so they feed into the player's horizontal velocity target instead of applying a low-magnitude post-input acceleration; wind now changes landing positions, remains traversable while walking or jumping into it, shows directional arrows that drift with the current, and is surfaced in the HUD status pill while active.
- Fixed ground enemy placement, patrol behavior, and contact rendering across all chapters so slimes and embers spawn with their feet on platform tops, show a grounded foot/shadow treatment, and patrol the full current platform without stepping beyond its edges.
- Redesigned wisp enemies as flying aurora wisps: they now spawn with a visible hover gap, use bounded vertical oscillation, draw a distant shadow, and use wing/core/tail visuals with no ground feet.
- Added `tests/gameplay-bugfix.js` to guard jump-traversable wind strength, visible wind direction, all-chapter enemy floor alignment, full-platform patrol bounds, ground contact rendering, and wisp hover readability.
- Bumped the web package to `1.2.1`, Android `versionCode` to 4 / `versionName` to `1.2.1`, and the service worker cache to `nini-yuan-v1.2.1-gameplay-fixes`.

## v1.2.0

- Reworked the visual layer into the **Aurora Inkwash · Night Atlas Cinematic** direction across web and Android WebView surfaces, without touching gameplay, save schema, audio routing, or controls.
- Re-architected `styles.css` into cascade layers (reset, tokens, base, surface, type, component, motion, responsive, a11y) and introduced a 9-step night ramp, a 6-step gold cartography ramp, and aurora gradient stops.
- Added performance-tuned signature details: brand brushwork reveal on first menu, static aurora halo around the menu heroes, character-card selection glow, a featured-chapter atlas ring, and a slower breathing aura on touch action buttons.
- Re-typeset menu, character grid, level grid, settings, modal, HUD pills, chapter intro, control tips, and toast surfaces with refined hairlines, OKLCH color tokens, gilded panel edges, and corner atlas notches.
- Removed full-screen animated blur, backdrop-filter surfaces, and duplicated menu Canvas character draws so the visual pass stays lighter on low-end WebView devices.
- Honored `prefers-reduced-motion` for touch breath and entry transitions, and added a `prefers-contrast: more` enhancement layer for hairlines and ink.
- Updated PWA manifest theme/background to the new night palette and bumped the service worker cache to `nini-yuan-v1.2.0-aurora` so existing players pick up the refreshed assets.
- Updated Android `windowBackground`, `colorAccent`, splash background, and tip color to match the refreshed palette.
- Bumped `versionCode` to 3 and `versionName` to `1.2.0`.

## v1.1.0

- Added save schema validation, migration, and localStorage tampering recovery.
- Added core storage, audio, and HUD rendering helpers while keeping the static no-bundler build.
- Hardened the Android WebView wrapper by removing unnecessary local access, disabling cleartext traffic, and adding lifecycle cleanup.
- Added PWA icons, service worker caching, and store asset capture script.
- Reworked the visual direction around the Nightbound Stellar Atlas design system with LXGW WenKai subsets, gold linework, redesigned menus, HUD, cards, and modal surfaces.
- Added placeholder character atlas files and loader support for future sprite sheets.
- Added regression coverage for storage, atlas schema, PWA assets, lifecycle pause/resume, save tampering, accessibility, Android wrapper safety, and browser smoke behavior.
- Added camera pixel snapping, touch haptic feedback, and Android build smoke CI.
- Added Android `sensorLandscape` startup with dedicated mobile landscape layout checks.
- Added bundled CC0 loopable BGM, BGM volume settings, offline caching, and source/license notice.
- Optimized the bundled BGM from the original 256 kbps Vorbis source to a smaller 44.1 kHz stereo Vorbis distribution file.
- Rewrote release-facing documentation, privacy policy, design docs, motion guide, GDD, and character atlas guide.

## v1.0.0

- First usable release of `Nini & Yuan`.
- Added the full Canvas platformer experience with five chapters.
- Added Nini and Yuan as selectable characters with distinct skills and projectiles.
- Added power-ups, enemies, hazards, moving platforms, wind zones, local save, and Chinese UI.
- Added Android WebView wrapper, adaptive launcher icon, and debug APK build script.
- Added regression tests for gameplay balance, Android startup compatibility, and browser/mobile smoke coverage.
