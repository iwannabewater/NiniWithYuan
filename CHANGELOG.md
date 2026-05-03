# Changelog

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
