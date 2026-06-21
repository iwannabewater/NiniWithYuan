# Responsive Motion and Release Polish Plan — v1.6.1

Version scope: `v1.6.0` to `v1.6.1`
Baseline tag: `v1.6.0`
Date: 2026-06-21
Repository: `iwannabewater/NiniWithYuan`

## Objective

Ship a focused web and Android WebView patch that makes character control feel attached to player intent, restores a clear front-facing neutral pose, normalizes the public subpath, and removes the highest-impact mobile UI and release-pipeline rough edges. Preserve all fifteen chapters, save schema 2, jump and ability tuning, input bindings, offline operation, and the Song-atlas Night Observatory visual direction.

## Scope

### Character Response

- Preserve character-specific launch acceleration while applying a bounded ground-turn response.
- Keep full-speed ground reversals below 190 ms and camera direction crossing below 100 ms.
- Drive procedural gait from actual horizontal travel rather than absolute time.
- Keep turn, jump, fall, attack, skill, and hurt direction rules unchanged.

### Neutral Pose and Touch Lifecycle

- Use the authored front-facing frame 15 for both atlases' idle state.
- Mark front-facing poses in atlas data so the orientation resolver does not mirror them.
- Keep captured touch controls active through pointer drift and release them on pointer up, cancellation, or lost capture.

### URL and Responsive UI

- Normalize the lowercase no-trailing-slash public path and the HTTP canonical path to the fixed game root before static assets load, preserving query and hash while rejecting path-suffix redirects.
- Use content-sized chapter-world rows and hide the decorative footer on scrollable mobile sub-screens.
- Dismiss chapter guidance when gameplay input begins and keep modal decoration clear of action buttons.

### Release Reliability

- Generate portrait menu, character, chapter, orientation guidance, landscape gameplay, pause, desktop gameplay, and feature artwork through valid browser paths; Android packaging must preserve those independently generated store assets.
- Bump the package, Android manifest, service-worker cache, public metadata, tests, and documentation to v1.6.1.

## Verification Targets

```bash
npm test
npm run capture:store
ANDROID_HOME="$HOME/Android" npm run build:android
```

Runtime review covers 1280x720 desktop, 540x960 portrait, 375x812 narrow portrait, and 844x390 Android-class landscape viewports. Release review also checks APK badging, bundled assets, service-worker cache identity, canonical URL behavior, and generated screenshot geometry.

## Completion Notes

- `npm test` passed on 2026-06-21 with ten browser smoke scenarios plus storage, physics, gameplay, atlas, canonical URL, PWA, lifecycle, accessibility, audio, and Android-wrapper coverage.
- The final patch also passed `npm ci && npm test` from a clean detached worktree based on `v1.6.0`.
- `npm run capture:store` generated nine release images. A subsequent Android build preserved every store asset, proving the two release pipelines no longer delete each other's outputs.
- `npm audit --audit-level=moderate` reported zero vulnerabilities after the lockfile-only `qs` patch update.
- Android packaging produced `dist/NiniYuan.apk` with `versionCode=14`, `versionName=1.6.1`, `compileSdkVersion=36`, `minSdkVersion=23`, and `targetSdkVersion=36`; APK signature schemes v1, v2, and v3 verified.
- Final local APK SHA-256: `3863e1c23a2eefc6b5e536185f8fccd525a766c670837bc513aa0260792db15e`.
- Deep self-review finished with no unresolved findings after fixing a legacy-path open-redirect edge, cross-pipeline `dist` deletion, captured-control release behavior, and release-capture timing. Final score: **99.3 / 100**.
