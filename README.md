# 妮妮源源历险记 / Nini & Yuan

`Nini & Yuan` is a Chinese-language fantasy platformer for the web and Android WebView. v2.1.0, **星野律动 / Starfield Cadence**, makes the existing fifteen-chapter journey more legible and alive: character poses settle by elapsed time, signature actions gain restrained contact and trail effects, every star domain carries its own prop language, enemies and wardens read at compact-phone scale, and guardian recovery windows now match their stated combat rule. The game remains offline and local-only, with two playable characters, schema-validated saves, adjustable touch, display, and assist settings, PWA support, and a reproducible APK build path.

## Gameplay

- Nini emphasizes precision platforming, double jumps, aerial glide control, and collection routes through the Xuanji Star Dial.
- Yuan emphasizes dash movement, crystal breaking, enemy breakthrough, and fast routes through the Jade Gui Sword.
- Each world finale is sealed by a 守望者 warden. Entering its arena locks the gate until the guardian falls. Attacks are telegraphed, the guardian descends into reach on its recovery beat, and three stages escalate as its star force drops.
- Every chapter derives 星灯 lanterns from its own platforms. Leaving the floor costs one health and returns the player to the last lit lantern.
- One 星髓 is hidden in each chapter, off the forward route and recorded the moment it is touched.
- Defeats and gems build a 连星 chain whose multiplier raises star dew only. Collection ratings still read the authored pickup value.
- Each chapter declares a par time. Recorded bests earn 星章, 月章, or 露章, and feed a thirty-entry 星录 achievement record.
- 星辉护佑 assist mode offers invulnerability, a skill without cooldown, a bonus air jump, and a 60 to 100 percent game speed. Assisted runs unlock chapters and record ratings and marrow, but never best times or medals.
- The game ships fifteen chapters across three worlds: World 1 / 破碎星图 covers the original five heart-stone chapters, World 2 / 星门群岛 contains five star-gate chapters, and World 3 / 星潮镜域 contains five phase-tide chapters.
- World 2 introduces paired star gates that preserve momentum, facing, character state, and route intent while using a short cooldown and safe-exit checks.
- World 3 introduces phase-tide bridges: platforms, pickups, and hazards can alternate between two readable star-tide phases without changing the base character physics.
- The application runs offline. It does not require login, networking, advertising SDKs, analytics SDKs, or server storage.
- Desktop play uses arrow keys or WASD. Android starts in landscape and uses a sliding direction rail with separate jump, skill, and projectile controls.
- The mobile web build pauses behind an orientation dialog in portrait. Players may continue in portrait or return to the menu.
- Opposite directions use the latest active source, then fall back to an earlier direction that remains held. Aliases and multi-touch actions stay active until their final source releases.
- Gameplay input never overrides focused menu buttons or settings controls. Menu, modal, focus, visibility, and orientation transitions clear transient input together.
- Settings cover master and BGM volume, HUD scale, visual effects, screen shake, touch size, touch opacity, and the assist group.
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

The suite covers syntax, physics and fixed-step balance, save migration and tampering recovery, input arbitration, character motion, Canvas materials, PWA assets, Android wrapper safety, audio lifecycle, accessibility, runtime mutation budgets, and real browser behavior. v2.1.0 adds elapsed-time pose convergence, action-effect and reduced-motion contracts, world scenery grammar, compact enemy scale, guardian phase-by-damage-source behavior, HUD type-floor and toast-clearance checks, plus Android signer, checksum, provenance, and immutable-action coverage.

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

The build script creates an ignored debug keystore when no signing configuration is supplied. That fallback is only a local or pull-request smoke package and must not be uploaded to a GitHub Release. Main-branch CI restores the protected signer used by the latest public APK line, verifies certificate SHA-256 `23fe694d4adfb093a752c6a90f23086c6744bc520c89656079d78414979457e7`, and attaches build provenance before retaining a release candidate. Store releases remain a separate production-signing and App Bundle workflow. See [Android Testing](docs/ANDROID_TESTING.md) for the exact-candidate gate.

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
│   ├── core/                  # Storage, audio, input, game-rule, progression, and frame-scheduling helpers
│   └── render/                # DOM, character/effect, creature, game-feel, warden, and Canvas material helpers
├── assets/
│   ├── characters/            # Character source art and production atlases
│   ├── audio/                 # Bundled CC0 BGM and provenance notice
│   ├── fonts/                 # Local LXGW WenKai subsets, provenance, and OFL
│   └── icons/                 # PWA icons
├── android/app/src/main/      # Android wrapper source and resources
├── scripts/                   # APK build, font subset, and store asset capture scripts
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

Rebuild the bundled font subsets after adding new Chinese copy:

```bash
npm run build:fonts
```

The script downloads the pinned LXGW WenKai v1.522 sources, verifies their checksums against `assets/fonts/NOTICE.md`, subsets both weights over every runtime code point, and prints the new digests to record in the notice. `npm test` fails when a runtime glyph is missing from either subset.

The bundled webfonts are application-specific subsets of the official LXGW WenKai v1.522 Regular and Medium release files. Medium is mapped to the application's 700 weight. The fonts remain under the SIL Open Font License 1.1; see [assets/fonts/NOTICE.md](assets/fonts/NOTICE.md) and [assets/fonts/OFL.txt](assets/fonts/OFL.txt).
