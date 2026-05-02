# Nini & Yuan

`Nini & Yuan` / `妮妮源源历险记` is a Chinese fantasy platformer inspired by classic side-scrolling adventure games. It runs as a static Canvas web game and can also be packaged into an Android WebView APK.

## Features

- Two playable characters: Nini and Yuan, with distinct movement, skills, projectiles, and visual identity.
- Five progression-based levels with moving platforms, hazards, enemies, wind zones, power-ups, collectibles, and saved progress.
- Responsive keyboard and touch controls.
- Chinese UI, local save support, character selection, level selection, settings, and Android launcher polish.
- Android adaptive launcher icon, splash/loading fallback, and WebView wrapper.

## Project Structure

```text
.
├── index.html                 # Web entry
├── styles.css                 # UI and HUD styling
├── src/game.js                # Canvas game engine and gameplay logic
├── assets/                    # Character art and local fonts
├── android/app/src/main/      # Android wrapper source and launcher resources
├── scripts/build-android.sh   # Manual APK build script
└── tests/                     # Mechanics, browser, and Android wrapper regression tests
```

## Requirements

- Node.js 20 or newer.
- npm.
- Playwright Chromium for browser smoke tests.
- For Android builds: Android SDK platform `android-36`, build-tools `36.0.0`, and JDK 17 or newer.

The Android build script reads `ANDROID_HOME` if set. If it is not set, it defaults to `$HOME/Android`.

## Setup

```bash
npm ci
npx playwright install chromium
```

## Run The Web Game

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

The test suite checks:

- JavaScript syntax.
- Jump and physics balance.
- Pickup, dash, and glide gameplay mechanics.
- Android wrapper startup compatibility.
- Browser smoke coverage for desktop and mobile layouts.

## Build Android APK

```bash
ANDROID_HOME="$HOME/Android" npm run build:android
```

Output:

```text
dist/NiniYuan.apk
```

The script creates a local debug keystore if needed. That keystore is intentionally ignored by git and is not suitable for store releases.

## Android Emulator Install

Copy `dist/NiniYuan.apk` to a Windows-local folder, then install it from Windows PowerShell:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$apk = "$env:USERPROFILE\Downloads\NiniYuan\NiniYuan.apk"

& $adb uninstall com.iwannabewater.niniyuan
& $adb install -r $apk
& $adb shell am start -n com.iwannabewater.niniyuan/.MainActivity
```

If the launcher caches an old icon, cold boot or restart the emulator.

## Release Notes

This repository currently produces a debug-signed APK for testing. For a real app store release, create a release keystore, increment version metadata, produce store screenshots, and review the privacy policy.

## Copyright

Copyright © iwannabewater.
