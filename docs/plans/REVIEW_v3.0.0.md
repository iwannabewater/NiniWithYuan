# Release review notes: v3.0.0 星河长卷 / Starriver Scroll

Status: release candidate on `feat/v3.0.0-starriver-scroll`. Not published.

## Scope Review

The milestone changes architecture, rendering, character presentation, creatures, interface, audio, and content (World 4). It keeps save schema 4 and character movement tuning. Two behaviour changes are deliberate bug fixes, listed below.

## Gates

- `npm test`: pass, including all real-browser suites.
- `node tests/browser-smoke.js`: pass.
- `npm run build:fonts`: rebuilt; digests recorded in `assets/fonts/NOTICE.md`.
- Local Android build: pass (`dist/NiniYuan.apk`, 8.8 MB); `scripts/inspect-android.sh`: pass.
- Performance (headless Chromium, frame task time): desktop 1280x720 6.5 to 5.2 ms; phone 844x390 at DPR 2 8.0 to 6.2 ms, against the v2.3.0 baseline. Headless Chromium rasterizes in software; real-device GPU numbers were not measured.

## Bug Fixes

- Yuan's dash could never contact-break crystals: collision resolved his body flush against the crystal, so the strict overlap test never fired. The dash now probes its swept path. Found while extracting the simulation.
- Player projectiles lost their colour when the simulation switched to semantic tones; the renderer now resolves the tone.
- Found in review: on Android (`file:///android_asset`), canvases holding atlas images are tainted, so runtime `getImageData` failed and the foot baselines and opaque-core rim silently fell back. Baselines now ship in `atlas.json` and the rim threshold uses compositing only.

## Retired Assertions

- `src/render/playfield-material.js` was removed. Its contracts (palette constants, pickup pulse, wind direction, reduced-motion stillness, glow compositing, DOM independence) moved to `tests/render/playfield.test.js`. Source-string assertions on its old implementation were dropped.
- The gilding vignette strokes and their rhythm helper were removed; `tests/character-gilded-v2_2_0.js` now asserts the moonlight rim instead.
- Tests that pinned fifteen chapters, three worlds, or thirty achievements now assert floors or derive counts.
- The offline-cache test now derives its asset list from the scripts in `index.html`.

## Known Limitations

- At 1024x768 the chapter atlas still scrolls by about 30 px; 1280x720 and larger fit on one page.
- The reachability validator is a conservative ballistic graph, not a full playthrough; it does not model timing windows of moving platforms, bridges, or phase tides.
- Audio is synthesized; there is still one licensed BGM track for every world.
- Creature and warden art is procedural Canvas drawing; the protagonists remain the only painted bitmaps.
- No device review has been done on physical Android hardware for this release.
