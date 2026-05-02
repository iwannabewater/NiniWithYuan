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
- BGM starts after entering gameplay, pauses on modal or menu, and respects the BGM volume slider.
- Nini glide starts when the skill button is held in the air.
- Yuan dash stops at short platform edges.
- Save data persists after closing and reopening the application.
