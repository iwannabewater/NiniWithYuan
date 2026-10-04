# 妮妮源源历险记 / Nini & Yuan

`Nini & Yuan` is a Chinese-language fantasy platformer for the web and Android WebView. v3.0.0, **星河长卷 / Starriver Scroll**, rebuilds the playfield as a nocturnal blue-green landscape scroll and adds a fourth world. Backdrops are painted once per chapter and viewport, then blitted at whole device pixels; terrain follows the mineral-pigment convention of blue-green landscape painting; the painted protagonists are grounded on their real foot line, graded for night light, rimmed by moonlight, and given spring-driven hem motion. Creatures and wardens become beings from Chinese myth (玉蟾, 祸斗, 灯魅; 烛龙, 巨鳌, 鲲, 天狗), and each one is introduced in place by a cinnabar name seal. World 4, **第四星域 银汉鹊桥**, adds magpie bridges and updrafts, and pickups now play plucked pentatonic phrases. In headless Chromium the frame task time fell from 6.5 to 5.2 ms on desktop and from 8.0 to 6.2 ms on a DPR 2 phone viewport against the v2.3.0 baseline, despite the richer art. The game remains offline and local-only, with two playable characters, schema-validated saves, adaptive touch, display, and assist settings, PWA support, and a reproducible APK build path.

## Gameplay

- Nini emphasizes precision platforming, double jumps, aerial glide control, and collection routes through the Xuanji Star Dial.
- Yuan emphasizes dash movement, crystal breaking, enemy breakthrough, and fast routes through the Jade Gui Sword.
- Each world finale is sealed by a mythic warden: 烛龙, 巨鳌, 鲲, and 天狗. Entering its arena locks the gate until the guardian falls. Attacks are telegraphed, the guardian descends into reach on its recovery beat, and three stages escalate as its star force drops.
- Every chapter derives 星灯 lanterns from its own platforms. Leaving the floor costs one health and returns the player to the last lit lantern.
- One 星髓 is hidden in each chapter, off the forward route and recorded the moment it is touched.
- Defeats and gems build a 连星 chain whose multiplier raises star dew only. Collection ratings still read the authored pickup value.
- Each chapter declares a par time. Recorded bests earn 星章, 月章, or 露章, and feed a thirty-two-entry 星录 achievement record.
- 星辉护佑 assist mode offers invulnerability, a skill without cooldown, a bonus air jump, and a 60 to 100 percent game speed. Assisted runs unlock chapters and record ratings and marrow, but never best times or medals.
- The game ships twenty chapters across four worlds: World 1 / 破碎星图 covers the original five heart-stone chapters, World 2 / 星门群岛 contains five star-gate chapters, World 3 / 星潮镜域 contains five phase-tide chapters, and World 4 / 银汉鹊桥 contains five Silver River chapters.
- World 2 introduces paired star gates that preserve momentum, facing, character state, and route intent while using a short cooldown and safe-exit checks.
- World 3 introduces phase-tide bridges: platforms, pickups, and hazards can alternate between two readable star-tide phases without changing the base character physics.
- World 4 introduces 鹊桥 magpie bridges, spans of sky held by a flock that scatter shortly after the player lands and regather once the span is clear, and 扶摇 updrafts that lift the player toward a capped rising speed.
- The first time each creature or fixture comes into view in a session, a lacquer name seal shows its Chinese name and a four-character hint.
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

The suite covers syntax checks, pure rules, the headless deterministic simulation (movement, combat, mechanics, wardens, magpie bridges, updrafts), authored chapter contracts, a reachability validator that proves every goal is reachable for both protagonists with their own kit, render contracts against recording canvases (terrain collision honesty, culling, whole-device-pixel backdrop blits, pooled effects, cloth motion, atlas baselines, name seals), save migration and tampering recovery, input arbitration, PWA assets, Android wrapper safety, audio lifecycle and pentatonic tuning, accessibility, runtime mutation budgets, and real browser behavior.

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
