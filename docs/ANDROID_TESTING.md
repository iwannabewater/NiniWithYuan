# Android Testing

## Android Studio Emulator

1. Open Android Studio.
2. Start a Pixel emulator from Device Manager.
3. Build the APK:

```bash
npm run build:android
```

4. Copy `dist/NiniYuan.apk` to a Windows-local folder when testing from WSL, then install from Windows PowerShell:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$apk = "$env:USERPROFILE\Downloads\NiniYuan\NiniYuan.apk"

& $adb uninstall com.iwannabewater.niniyuan
& $adb install -r $apk
& $adb shell am start -n com.iwannabewater.niniyuan/.MainActivity
```

## Logs

```powershell
& $adb logcat -c
& $adb shell am start -n com.iwannabewater.niniyuan/.MainActivity
Start-Sleep -Seconds 5
& $adb logcat -d | Select-String -Pattern "NiniYuan|AndroidRuntime|FATAL EXCEPTION|chromium|WebView"
```

## Manual Smoke Checklist

- App launches from the Android launcher.
- App starts in landscape on phones and rotates only between the two landscape orientations.
- Launcher icon renders cleanly under round and rounded-square masks.
- Splash text uses a real line break.
- Character selection works.
- Touch controls respond with low latency.
- Landscape gameplay HUD, chapter intro, and touch buttons do not overlap.
- Main-menu subtitle reads naturally, the cover hero includes subtle star-chart detail without visual crowding, and chapter-card text starts from a consistent left edge across the first four chapters.
- The chapter score line on each card reads as gold filled stars, muted empty stars, and a gold tabular best-time value; locked chapters drop the gold tint without breaking layout.
- The empty viewport zones to the left, right, and below the menu panel show low-opacity drifting calligraphic runes, twinkling sparks, a small connected six-star glyph on the right, and a footer placard with version, scope, a star-quote line, and credit; the layer disappears as soon as gameplay begins.
- On desktop/fine-pointer browser review, moving the pointer quickly over the cover hero or main title leaves visible gold/rose/jade/cyan stardust above the menu surface with no obvious gaps; touch and coarse-pointer WebView review should still show no pointer trail.
- Rapid clicking or long-pressing the title, menu buttons, and Android touch controls should not create blue text-selection highlights or WebView callout selection handles.
- Hidden-surprise review: `5 → 2 → 0` opens the first letter, and either `↑↑↓↓←→ N Y` or `↑↑↓↓←→←→ N Y` opens the second letter plus a rose-gold heart.
- Touch ambient layer hides the side rails on portrait phones and keeps a compact strip in landscape; the strip never overlaps gameplay HUD or touch buttons.
- Chapter 3 and chapter 5 wind fields show clear directional arrows that move with the wind direction, visibly push the player, change landing positions, and remain enterable while holding movement plus jump into the wind on the shared WebView gameplay build.
- Slime and ember enemies in every chapter keep their feet visually on platform tops, show contact shadow/feet, and patrol the full current platform without stepping beyond its edges; wisp enemies present as flying enemies with a visible hover gap, wing/glow silhouette, tail trail, and no ground feet.
- BGM starts after entering gameplay, pauses on modal or menu, and respects the BGM volume slider.
- Nini glide starts when the skill button is held in the air.
- Yuan dash stops at short platform edges.
- Save data persists after closing and reopening the application.
