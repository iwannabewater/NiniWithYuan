# Android Testing

The Android app is a landscape WebView wrapper around the same local assets used by the browser build. A v1.9.0 release is ready only after the repository checks, APK inspection, and device review below have passed on the release commit.

## Build Prerequisites

- Android SDK platform 36 and build-tools 36.0.0 under `${ANDROID_HOME:-$HOME/Android}`.
- Java 17 available through `JAVA_HOME` or `PATH`.
- Playwright Chromium installed for browser and store-asset checks.

Run the repository gates before packaging:

```bash
npm test
node tests/browser-smoke.js
npm run capture:store
npm run build:android
```

The build writes `dist/NiniYuan.apk`. Build output, packaged WebView assets, and store captures remain ignored and must not be committed.

## Install and Launch

Start a phone emulator or connect a test device, then install the current artifact:

```bash
adb uninstall com.iwannabewater.niniyuan || true
adb install -r dist/NiniYuan.apk
adb shell am start -n com.iwannabewater.niniyuan/.MainActivity
```

On Windows PowerShell:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$apk = "$env:USERPROFILE\Downloads\NiniYuan\NiniYuan.apk"

& $adb uninstall com.iwannabewater.niniyuan
& $adb install -r $apk
& $adb shell am start -n com.iwannabewater.niniyuan/.MainActivity
```

Capture a clean startup log after installation:

```bash
adb logcat -c
adb shell am force-stop com.iwannabewater.niniyuan
adb shell am start -n com.iwannabewater.niniyuan/.MainActivity
sleep 5
adb logcat -d | rg "NiniYuan|AndroidRuntime|FATAL EXCEPTION|chromium|WebView"
```

No `AndroidRuntime`, `FATAL EXCEPTION`, missing-asset, or WebView script error may remain.

## APK Release Inspection

Set the build-tools path once:

```bash
BUILD_TOOLS="${ANDROID_HOME:-$HOME/Android}/build-tools/36.0.0"
```

Badging for v1.9.0 must report package `com.iwannabewater.niniyuan`, `versionCode=19`, `versionName=1.9.0`, `minSdkVersion=23`, and `targetSdkVersion=36`:

```bash
"$BUILD_TOOLS/aapt" dump badging dist/NiniYuan.apk
```

Verify the signature and record the output. Schemes v1, v2, and v3 must report `true`:

```bash
"$BUILD_TOOLS/apksigner" verify --verbose --print-certs dist/NiniYuan.apk
```

Inspect the package for the current runtime, local fonts, and bundled font license:

```bash
unzip -l dist/NiniYuan.apk | rg "assets/(index.html|styles.css|service-worker.js|src/game.js|src/core/input-state.js|src/render/character-motion.js|assets/fonts/.+woff2|assets/fonts/NOTICE.md|assets/fonts/OFL.txt)"
shasum -a 256 dist/NiniYuan.apk
```

Keep the SHA-256 value with the release record. After GitHub release upload, download the published asset and compare its hash and badging with the local artifact.

## Device Matrix

Review at least these surfaces:

- A compact phone near 844 by 390 CSS pixels in landscape.
- A taller 16:9 or wider phone in both sensor-landscape orientations.
- A device or emulator with a hardware keyboard for keyboard and focus checks.
- TalkBack on a touch device for semantic button activation and control labels.

The Android activity must launch in landscape and rotate only between the two landscape orientations. The launcher icon must preserve both Nini and Yuan under round and rounded-square masks.

## Menu and Settings Review

- The main menu keeps the paired hero art dominant while the primary journey action remains the clearest control.
- Character cards compare Nini and Yuan in one horizontal editorial sheet. Selection text and `aria-pressed` update together.
- Chapter selection presents three world tracks with five chapters each. Locked chapters state that the previous chapter must be completed.
- Compact landscape screens do not clip headings, actions, world tracks, settings, or version text.
- Menu and character actions retain at least 44 by 44 CSS pixel targets. Pause, back, and portrait-dialog actions retain at least 48 by 48 CSS pixels.
- Master volume, BGM volume, HUD scale, touch size, and touch opacity preview immediately and persist after relaunch.
- The high-frame-rate effects and screen-shake toggles persist. Turning shake off stops current shake and prevents later impact shake.
- Rapid slider movement produces a bounded trailing save rather than a write on every input event.

## Gameplay and Input Review

- On compact landscape, the five gameplay controls remain between 64 and 84 CSS pixels and do not cover health, status, cooldown, pause, or the World 3 phase countdown.
- Hold the left touch rail and slide across its midpoint. Direction changes without lifting, and the held direction clears on release or lost capture.
- Hold movement with one finger while pressing jump, skill, and shoot with another. Releasing either finger must not cancel the action still held by the other.
- With both left and right active, the latest press wins. Releasing it returns to the direction still held.
- Activate touch buttons through TalkBack or a hardware keyboard. A synthesized press must create a useful movement nudge or jump without firing twice.
- Tap Nini's skill briefly after jumping. The glide pose and movement remain visible for the 120 ms intent window, and cooldown starts only after glide begins.
- Yuan's dash pose faces `dashDir` and stops safely at a short platform edge.
- Airborne direction changes keep jump or fall art. Fast landings return to run after the impact beat.
- Player and camera travel remain smooth at compact landscape scale. Portal travel, respawn, and the frame after hit-stop must not sweep or rewind.
- Pause, resume, menu return, focus loss, and app backgrounding clear gameplay input. A key held across the boundary must stay suppressed until release.
- BGM begins after gameplay starts, pauses with menus and dialogs, and respects master and music volume.
- A schema 3 save preserves character, unlocked chapters, ratings, times, and every setting after the app is closed and reopened.

## Browser-Only Orientation Review

The Android activity is landscape-only, but the mobile web build also supports portrait entry. At 390 by 844, the orientation dialog must freeze simulation, own focus, and expose two actions: continue in portrait or return to the menu. Continuing restores HUD and touch controls; returning removes them and clears input state.

## Store Asset Gate

`npm run capture:store` must produce nine stable 24-bit RGB PNG files without alpha:

- Four portrait screenshots at 1080 by 1920.
- Three landscape screenshots at 1920 by 1080.
- One desktop gameplay screenshot at 1280 by 720.
- One feature graphic at 1024 by 500.

Run capture twice from the release commit and compare SHA-256 hashes for all nine files. Inspect menu, character, chapter, orientation, gameplay, pause, and feature surfaces at full size before publishing.
