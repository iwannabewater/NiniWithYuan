# 妮妮源源历险记 / Nini & Yuan

`Nini & Yuan` is a Chinese-language fantasy platformer for the web and Android WebView. The current v1.2.3 build keeps the **Aurora Inkwash · Night Atlas Cinematic** visual pass from v1.2.0, the v1.2.1 gameplay fixes, and the v1.2.2 menu polish, then adds the v1.2.3 **Starlit Whispers** aesthetic-and-interaction pass: gilded chapter score metadata, an ambient star-rune side layer that reclaims the empty viewport zones, a soft pointer stardust trail on the cover, and a small set of hidden Yuan-to-Nini surprises. The v1.1.0 content baseline is unchanged: two playable characters, five handcrafted chapters, local save data, landscape touch controls, adjustable background music, PWA metadata, and a reproducible debug APK build path.

## Gameplay

- Nini emphasizes precision platforming, double jumps, aerial glide control, and collection routes.
- Yuan emphasizes dash movement, crystal breaking, enemy breakthrough, and fast routes.
- The game ships five chapters: Starlight Garden, Moon-Mirror Ruins, Cloudsea Sails, Radiant Forge, and Aurora Citadel.
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

The test suite covers JavaScript syntax, save schema migration, localStorage tampering recovery, physics balance, character atlas schema validation, Android wrapper safety, PWA assets, BGM integration, lifecycle pause/resume behavior, accessibility, and browser smoke scenarios across desktop, mobile portrait, and mobile landscape viewports. The v1.2.3 smoke path also verifies the ambient layer stacking, fine-pointer stardust trail, and functional 520/Konami hidden-surprise triggers.

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
- [Privacy Policy](PRIVACY.md)

## Privacy

The game is offline. Save data remains in localStorage on the player's device and is not transmitted to a server. See [PRIVACY.md](PRIVACY.md).

## License

Code is MIT © iwannabewater. The bundled BGM is CC0 1.0; see [assets/audio/NOTICE.md](assets/audio/NOTICE.md).
