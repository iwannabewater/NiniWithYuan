# State-of-the-Art Optimization Plan and Completion Record

Version scope: `v1.0.0` to `v1.1.0`
Baseline commit: `067fb8e`
Completion date: 2026-05-02
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.1.0 optimization program converts the initial playable prototype into a release-ready offline platformer. The work focuses on security, reproducible builds, runtime stability, mobile landscape ergonomics, visual identity, local audio, PWA metadata, and documentation suitable for a public source repository.

The scope does not include online play, cloud saves, monetization, additional chapters, or a framework migration.

## Baseline Assessment

The v1.0.0 codebase already provided the core playable loop: two characters, five chapters, fixed-step physics, enemies, hazards, power-ups, local saves, browser smoke tests, and a manual Android WebView wrapper.

The release blockers were:

- Android WebView configuration allowed unnecessary local and cleartext access.
- `npm start` depended on an undeclared local server package.
- Save data accepted malformed localStorage state without schema enforcement.
- The HUD and menu rendering used patterns that would be fragile under user-controlled data.
- PWA metadata was incomplete.
- The Android build copied only the single gameplay script instead of the full source tree.
- Visual language, documentation, and audio provenance were not yet organized as release assets.

## Completed Work

### Sprint 1: Security and Build Foundation

- Removed unnecessary WebView local access and universal file access exposure.
- Removed cleartext traffic from the Android manifest.
- Added explicit WebView mixed-content blocking and disabled unneeded content access.
- Added `http-server` to development dependencies and made the web start command reproducible.
- Preserved fixed-step physics and renamed the dash edge guard for clearer maintenance.
- Updated Android wrapper tests to enforce the security posture.

### Sprint 2: Runtime Resilience

- Added `src/core/storage.js` with schema version 2, migration, type clamping, and chapter ID allow-listing.
- Added tests for malformed localStorage, unavailable storage, and save schema boundaries.
- Added `src/render/hud.js` for DOM construction without dynamic `innerHTML`.
- Added `src/core/audio.js` for SFX and BGM management.
- Added lifecycle handling for `visibilitychange`, `pagehide`, and foreground return.
- Clamped the accumulated timestep after background transitions.
- Fixed power-up size rollback behavior and wind velocity bounds.

### Sprint 3: Visual System and Mobile Layout

- Replaced the prior font package with local LXGW WenKai subsets.
- Introduced the night-atlas color system, gold linework, jade and rose character accents, and compact HUD treatment.
- Reworked menu, character selection, chapter selection, settings, modal, and HUD surfaces.
- Added mobile landscape layout rules for gameplay, controls, and chapter intro content.
- Added haptic requests for touch jump, skill, and shoot controls.
- Added character atlas placeholder files and loader support for future sprite sheets.

### Sprint 4: PWA, Release Documentation, and Store Assets

- Added PWA icons and a service worker cache manifest for the web build.
- Added store asset capture automation.
- Rewrote public documentation in English, with the Chinese title retained only in the README heading.
- Rewrote the privacy policy against the Google Play Data Safety categories.
- Removed local assistant-specific contributor guidance from the publishable file set.

### Sprint 5: Audio and Final Package Size

- Added the CC0 `Fairy Adventure` BGM track by MintoDog with a local provenance notice.
- Added BGM volume settings and pause/resume behavior in gameplay, menus, modals, and lifecycle events.
- Re-encoded the bundled Vorbis file from the original 256 kbps stream to Vorbis q4 while preserving 44.1 kHz stereo and the 144 s duration.
- Reduced `assets/audio/fairy-adventure.ogg` from 4,657,629 bytes to 2,195,434 bytes.

## Verification Targets

The release gate for this repository is:

```bash
npm test
npm run build:android
```

The expected APK output is:

```text
dist/NiniYuan.apk
```

Manual emulator validation remains useful before store submission because it verifies device-specific WebView, orientation, icon mask, and audio-focus behavior that the local browser tests cannot fully model.

## Residual Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Android WebView behavior differs across vendor images. | Medium | Run the manual smoke checklist on at least one Android 7-8 emulator and one Android 14+ emulator before store submission. |
| Service workers do not apply to the Android `file://` runtime. | Low | Android uses bundled assets directly; the service worker is a web/PWA feature only. |
| Character art remains single-frame. | Low | Atlas placeholders allow a later sprite-sheet replacement without gameplay changes. |
| The debug APK is not store-signable. | High for release distribution | Use a production signing key and the target store packaging process for public release. |

## Release Checklist

- [x] WebView local and cleartext access hardened.
- [x] Save schema validation and tampering recovery implemented.
- [x] PWA manifest and service worker assets present.
- [x] Local BGM bundled with provenance notice.
- [x] BGM package size reduced.
- [x] Android landscape entry configured.
- [x] Public documentation converted to English.
- [x] Local assistant-specific guidance excluded from publication.
- [x] `npm test` passes after final documentation and audio changes.
- [x] `npm run build:android` succeeds after final audio replacement.
- [ ] Manual Android emulator smoke test completed before store submission.
