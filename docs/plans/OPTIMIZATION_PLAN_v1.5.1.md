# Mobile Skill-Control Alignment Plan — v1.5.1

Version scope: `v1.5.0` to `v1.5.1`
Baseline tag: `v1.5.0`
Date: 2026-05-12
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.5.1 release is a focused web and Android WebView patch on top of the v1.5.0 game-feel release. It keeps the 15 chapters, save schema, physics constants, input bindings, audio routing, visual identity, and Android native wrapper behavior intact.

The release ships three small release-track fixes:

- Publish the canonical public game URL through GitHub Pages.
- Normalize legacy project URLs to the canonical game subdomain URL.
- Fix the mobile action touch controls so the `跳 / 技 / 弹` labels and their glyph marks stay centered inside the circular buttons on portrait phones and Android landscape.

## Scope

### Canonical Web Delivery

- Add the canonical URL `https://game.whynotsleep.cc/niniwithyuan/` to `index.html`.
- Redirect legacy apex, `www`, GitHub Pages, and old game-subdomain project paths to the canonical URL while preserving query strings and hashes.
- Add a GitHub Pages workflow that installs dependencies, runs `npm test`, packages the static site, uploads the artifact, and deploys from `main`.

### Mobile Touch Controls

- Replace percentage-padding label placement on `.touch-btn.jump`, `.touch-btn.skill`, and `.touch-btn.shoot` with a vertical flex stack.
- Keep the runtime `--touch-size` setting intact by deriving a local `--touch-control-size` for portrait, landscape, and narrow handset media rules.
- Keep existing labels, aria names, SVG mask glyphs, color treatments, haptic behavior, and button order unchanged.

### Release Metadata

- Bump package and lockfile to `1.5.1`.
- Bump Android to `versionCode=12`, `versionName=1.5.1`.
- Bump the service worker cache to `nini-yuan-v1.5.1-mobile-skill-control`.
- Update `README.md`, `CHANGELOG.md`, `docs/GDD.md`, `docs/DESIGN.md`, `docs/ANDROID_TESTING.md`, and release metadata tests.

## Tests

- Add `tests/canonical-url.js` for the canonical link and legacy redirect script.
- Extend `tests/browser-smoke.js` to measure real action-label bounding boxes in mobile portrait and mobile landscape.
- Widen v1.2.3, v1.2.4, v1.4.0, and typography/copy release metadata guards for `1.5.1`, Android `versionCode=12`, and the new service worker cache key.

## Verification Targets

```bash
npm test
npm run build:android
```

The Android build should produce `dist/NiniYuan.apk` with `versionCode=12`, `versionName=1.5.1`, `compileSdkVersion=36`, `min-sdk-version=23`, and `targetSdkVersion=36`.

## Manual Review Checklist

- Open `https://game.whynotsleep.cc/niniwithyuan/` and confirm the game shell loads.
- Open legacy project URLs and confirm they redirect to the canonical game subdomain while preserving query and hash.
- Review mobile portrait around 390 x 844: `跳 / 技 / 弹` labels sit inside the circular buttons with glyph marks above them.
- Review Android landscape around 844 x 390: HUD, chapter intro, and touch controls do not overlap, and the `技` label stays centered inside the skill button.
- Confirm user-adjusted touch size still changes button diameter without separating labels from glyph marks.

## Completion Notes

- `npm run test:smoke` passed locally on 2026-05-12 with the new mobile action-label geometry assertions.
- `npm test` passed locally on 2026-05-12 after the v1.5.1 metadata pass.
- `npm run build:android` passed locally on 2026-05-12 and produced `dist/NiniYuan.apk`.
  - APK badging: `versionCode=12`, `versionName=1.5.1`, `compileSdkVersion=36`, `min-sdk-version=23`, `targetSdkVersion=36`.
  - APK SHA-256: `1fdfe19ddaf940d7630ffac668fd421a5cd00b2a4c9c4b20137e2f65258274ce`.
  - APK assets contain `service-worker.js` with `nini-yuan-v1.5.1-mobile-skill-control`, the canonical URL script, and the `v1.5.1` ambient strip.
- Build outputs (`build/`, `dist/`, `android/app/src/main/assets/`) remain ignored and must not be committed.
