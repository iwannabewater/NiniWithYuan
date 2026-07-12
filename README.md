# 妮妮源源历险记 / Nini & Yuan

`Nini & Yuan` is a Chinese-language fantasy platformer for the web and Android WebView. v1.8.0 brings the Song-atlas Night Observatory direction into one responsive interface, joins keyboard, touch, pointer, and assistive activation behind the same action model, and gives both characters simulation-timed motion with fixed-step presentation smoothing. The game remains offline and local-only, with two playable characters, fifteen handcrafted chapters, schema-validated saves, adjustable touch and display settings, PWA support, and a reproducible debug APK build path.

## Gameplay

- Nini emphasizes precision platforming, double jumps, aerial glide control, and collection routes through the Xuanji Star Dial.
- Yuan emphasizes dash movement, crystal breaking, enemy breakthrough, and fast routes through the Jade Gui Sword.
- The game ships fifteen chapters across three worlds: World 1 / 破碎星图 covers the original five heart-stone chapters, World 2 / 星门群岛 contains five star-gate chapters, and World 3 / 星潮镜域 contains five phase-tide chapters.
- World 2 introduces paired star gates that preserve momentum, facing, character state, and route intent while using a short cooldown and safe-exit checks.
- World 3 introduces phase-tide bridges: platforms, pickups, and hazards can alternate between two readable star-tide phases without changing the base character physics.
- The application runs offline. It does not require login, networking, advertising SDKs, analytics SDKs, or server storage.
- Desktop play uses arrow keys or WASD. Android starts in landscape and uses a sliding direction rail with separate jump, skill, and projectile controls.
- The mobile web build pauses behind an orientation dialog in portrait. Players may continue in portrait or return to the menu.
- Opposite directions use the latest active source, then fall back to an earlier direction that remains held. Aliases and multi-touch actions stay active until their final source releases.
- Gameplay input never overrides focused menu buttons or settings controls. Menu, modal, focus, visibility, and orientation transitions clear transient input together.
- Settings cover master and BGM volume, HUD scale, touch size, touch opacity, visual effects, and screen shake.
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

The suite covers syntax, physics and fixed-step balance, save migration and tampering recovery, input arbitration, character motion, Canvas materials, PWA assets, Android wrapper safety, audio lifecycle, accessibility, runtime mutation budgets, and real browser behavior. v1.8.0 adds focused checks for multi-source input fallback, short Nini glide intent, hit-stop interpolation recovery, modal isolation, five viewport and input-modality layouts, deterministic store capture, and local font provenance.

Run the cross-viewport browser path directly after layout, Canvas, or asset changes:

```bash
node tests/browser-smoke.js
```

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

Generate store screenshots and the feature graphic:

```bash
npm run capture:store
```

The generated files are written to:

```text
dist/store-assets/
```

The capture set contains four 1080 by 1920 portrait screenshots, three 1920 by 1080 landscape screenshots, one 1280 by 720 desktop screenshot, and one 1024 by 500 feature graphic. Every file must be an opaque 24-bit RGB PNG. The capture script seeds runtime randomness, removes date-sensitive overlays, waits for visual assets, compares consecutive frames, and rejects invalid dimensions, color type, or screenshot aspect ratio.

## Project Structure

```text
.
├── index.html                 # Web entry
├── styles.css                 # Interface, HUD, motion, and responsive styling
├── src/
│   ├── game.js                # Canvas game loop and gameplay logic
│   ├── core/                  # Storage, audio, input, game-rule, and frame-scheduling helpers
│   └── render/                # DOM, character-motion, game-feel, and Canvas material helpers
├── assets/
│   ├── characters/            # Character source art and production atlases
│   ├── audio/                 # Bundled CC0 BGM and provenance notice
│   ├── fonts/                 # Local LXGW WenKai subsets, provenance, and OFL
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

Code is MIT © iwannabewater.

The bundled BGM is CC0 1.0; see [assets/audio/NOTICE.md](assets/audio/NOTICE.md).

The bundled webfonts are application-specific subsets of the official LXGW WenKai v1.522 Regular and Medium release files. Medium is mapped to the application's 700 weight. The fonts remain under the SIL Open Font License 1.1; see [assets/fonts/NOTICE.md](assets/fonts/NOTICE.md) and [assets/fonts/OFL.txt](assets/fonts/OFL.txt).
