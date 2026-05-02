# Changelog

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
