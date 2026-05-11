# 妮妮源源历险记 / Nini & Yuan

`Nini & Yuan` is a Chinese-language fantasy platformer for the web and Android WebView. The current v1.5.1 build keeps the **Aurora Inkwash · Night Atlas Cinematic** visual shell, v1.2.x gameplay/menu polish, Starlit Whispers ambient layer, Aurora Cartography interaction pass, World 2 star-gate expansion, v1.3.1 typography/copy hardening, the v1.4.0 World 2 / World 3 phase-tide expansion, and the v1.5.0 game-feel and sound-design pass, then fixes mobile touch-control label alignment for the `跳 / 技 / 弹` action buttons. The baseline remains offline, local-only, dependency-light, and WebView-ready: two playable characters, fifteen handcrafted chapters, local save data, landscape touch controls, adjustable background music, PWA metadata, and a reproducible debug APK build path.

## Gameplay

- Nini emphasizes precision platforming, double jumps, aerial glide control, and collection routes.
- Yuan emphasizes dash movement, crystal breaking, enemy breakthrough, and fast routes.
- The game ships fifteen chapters across three worlds: World 1 / 破碎星图 covers the original five heart-stone chapters, World 2 / 星门群岛 contains five star-gate chapters, and World 3 / 星潮镜域 contains five phase-tide chapters.
- World 2 introduces paired star gates that preserve momentum, facing, character state, and route intent while using a short cooldown and safe-exit checks.
- World 3 introduces phase-tide bridges: platforms, pickups, and hazards can alternate between two readable star-tide phases without changing the base character physics.
- The application runs offline. It does not require login, networking, advertising SDKs, analytics SDKs, or server storage.
- Desktop play uses arrow keys or WASD. Android starts in landscape and uses on-screen controls.
- The bundled background track is a local CC0 Vorbis file with an independent volume control.

## Requirements

- Node.js 20 or newer.
- npm.
- Playwright Chromium for browser regression tests.
- Android SDK platform `android-36`, Android build-tools `36.0.0`, and JDK 17 or newer for APK builds.

## Setup

```bash
npm ci
npx playwright install chromium
```

Run the web version:

```bash
npm start
```

Open:

```text
http://127.0.0.1:4173
```

## Test

```bash
npm test
```

The test suite covers JavaScript syntax, save schema migration, localStorage tampering recovery, physics balance, character atlas schema validation, Android wrapper safety, PWA assets, BGM integration and retry, lifecycle pause/resume behavior, accessibility, and browser smoke scenarios across desktop, mobile portrait, and mobile landscape viewports. The v1.2.3/v1.2.4 smoke paths still verify the ambient layer, hidden surprises, cartography polish, and reduced-motion contracts. The v1.4.0 expansion adds content, portal, phase-tide, storage, browser-smoke, and typography/copy regression files for three-world grouping, fifteen-chapter save compatibility, safe portal authoring, phase-object validity, shared font-stack usage, local Chinese glyph coverage, and count-free current UI copy. The v1.5.0 game-feel suite pins hit-stop math, camera lookahead, shake clamping, semantic cue shape, landing puff behavior, and unchanged platforming constants. The v1.5.1 browser smoke path additionally measures mobile action-button label geometry so touch labels cannot drift away from their circular buttons again.

## Android APK

```bash
ANDROID_HOME="$HOME/Android" npm run build:android
```

The build output is:

```text
dist/NiniYuan.apk
```

The build script creates a local debug keystore when one is not present. The keystore is ignored by git and is valid only for local testing. Store releases require a production signing key and an App Bundle or release package prepared through the target store workflow.

The Android entry point uses `sensorLandscape`, so phones start in landscape and may rotate between the two landscape orientations.

## Store Assets

Generate store screenshots and a 1024 x 500 feature graphic:

```bash
npm run capture:store
```

The generated files are written to:

```text
dist/store-assets/
```

## Project Structure

```text
.
├── index.html                 # Web entry
├── styles.css                 # Interface, HUD, motion, and responsive styling
├── src/
│   ├── game.js                # Canvas game loop and gameplay logic
│   ├── core/                  # Storage and audio helpers
│   └── render/                # DOM rendering helpers
├── assets/
│   ├── characters/            # Character PNGs and atlas placeholders
│   ├── audio/                 # Bundled CC0 BGM and provenance notice
│   ├── fonts/                 # Local LXGW WenKai subsets
│   └── icons/                 # PWA icons
├── android/app/src/main/      # Android wrapper source and resources
├── scripts/                   # APK build and store asset capture scripts
├── docs/                      # Design, motion, GDD, atlas, and Android testing notes
└── tests/                     # Unit, browser, E2E, and wrapper checks
```

## Documentation

- [Game Design Document](docs/GDD.md)
- [Design System](docs/DESIGN.md)
- [Motion Guide](docs/MOTION.md)
- [Character Atlas](docs/CHARACTER_ATLAS.md)
- [Android Testing](docs/ANDROID_TESTING.md)
- [Optimization Plans](docs/plans/README.md)
- [Privacy Policy](PRIVACY.md)

## Privacy

The game is offline. Save data remains in localStorage on the player's device and is not transmitted to a server. See [PRIVACY.md](PRIVACY.md).

## License

Code is MIT © iwannabewater. The bundled BGM is CC0 1.0; see [assets/audio/NOTICE.md](assets/audio/NOTICE.md).
