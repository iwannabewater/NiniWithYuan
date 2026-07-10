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
- v1.2.4 — the featured chapter card shows a slow rotating gold compass ring; on grid hover (desktop browser review) the four ordinary chapter cards reveal a hairline meridian rail with four small gold/jade/rose/cyan dots between them.
- v1.2.4 — the brand wordmark gains a soft gold/rose/jade brushwork stroke on first paint that settles after about 1.5 s.
- v1.2.4 — on touch the cover heroes do a slow 7 s breath tilt; on desktop fine-pointer review they parallax against the cursor without crossing each other.
- v1.2.4 — entering a chapter shows the bossbar, chapter intro card, and control tips arrive in a coordinated stagger rather than all at once.
- v1.2.4 — when the player picks up coins or gems, the canvas burst shows a gold halo ring and the floating "+1" text reads as gilded; toggling the high-frame-rate FX setting off removes both effects.
- v1.2.4 — the touch action buttons (`跳 / 技 / 弹`) carry a refined glyph mark above the existing label; the labels are still announced as `跳跃 / 技能 / 发射` on TalkBack.
- v1.2.4/v1.6.1 — the pause modal card shows a small breathing gold atlas seal in the upper-right corner, clear of the action row, plus a faint paper grain across the card body.
- v1.2.4 — the settings rows are prefixed with rune chips (♪ / ♬ / ◐ / ✦) without changing the slider/checkbox positions.
- v1.2.4 hidden surprise — on desktop fine-pointer review only, clicking all six ambient sparks within fifteen seconds opens a fourth letter modal and a heart; on Android touch this surprise stays inactive so the existing five surprises are the public phone surface.
- v1.3.0 — chapter select shows two world headings: `第一星域 破碎星图` above chapters 1-5 and `第二星域 星门群岛` above chapters 6-8. Locked cards retain the existing dim treatment.
- v1.3.0 — finishing chapter 5 unlocks chapter 6; existing completed-Aurora-Citadel saves open World 2, while saves that only unlocked chapter 5 still ask the player to finish chapter 5.
- v1.3.0 — each World 2 chapter contains paired star gates. Entering one gate moves the player to its pair, preserves movement direction and momentum, avoids wall/solid overlap, and shows a short `星门` cue.
- v1.3.0 — chapter 8 combines gates, wind, moving platforms, and crystals without HUD/control overlap in Android landscape.
- v1.3.0 — menu/install metadata reflects the expanded chapter scope, and the APK badging reports `versionCode=8` / `versionName=1.3.0`.
- v1.3.1 — menu/install metadata reads `多世界章节`; Yuan-to-Nini easter-egg copy no longer mentions a fixed chapter count, and Canvas float text uses the same WenKai-led typography as the DOM UI.
- v1.3.1 — chapter-select world subtitles and World 2 chapter names render without mixed Chinese font fallback, especially `五枚心石碎片`, `星门重新接合路线`, `星门浅湾`, `回环灯塔`, and `星环温室`.
- v1.3.1 — APK badging reports `versionCode=9` / `versionName=1.3.1`.
- v1.4.0 — chapter select shows three world headings: `第一星域 破碎星图`, `第二星域 星门群岛`, and `第三星域 星潮镜域`; all 15 chapter cards remain readable in Android landscape and browser portrait review.
- v1.4.0 — World 2 chapters 9 and 10 contain paired star gates with safe exits and no immediate back-bounce; chapter 10 reads as the star-gate finale rather than a new mechanic tutorial.
- v1.4.0 — World 3 chapters 11-15 show phase-tide bridges: active bridges are solid, inactive bridges appear as ghosted mirror silhouettes, pickups/hazards obey the current phase, and the HUD status reports `星潮 甲相` or `星潮 乙相`.
- v1.4.0 — existing v1.3.1 saves that completed chapter 8 unlock chapter 9, while tampered saves clamp to `15 / 15`; APK badging reports `versionCode=10` / `versionName=1.4.0`.
- v1.5.0 — Yuan dash, stomps, projectile hits, crystal breaks, and hurt reactions have short readable impact beats without changing jump or dash reach; reduced-motion disables the freeze.
- v1.5.0 — hard landings show dust, respawns show a short ink veil, and camera lookahead improves fast Yuan routes in chapters 5, 10, and 15 without hiding nearby hazards.
- v1.5.0 — BGM starts after gameplay begins; if the first attempt is blocked by WebView autoplay policy, a later tap or key press starts it. APK badging reports `versionCode=11` / `versionName=1.5.0`.
- v1.5.1 — Android landscape touch controls keep the `跳 / 技 / 弹` labels and glyph marks centered inside the circular buttons. APK badging reports `versionCode=12` / `versionName=1.5.1`.
- v1.6.0 — the launcher uses the Xuanji Union Seal, both protagonists use production motion atlases, and portrait web play shows the crafted orientation prompt. APK badging reports `versionCode=13` / `versionName=1.6.0`.
- v1.6.1 — both protagonists stop in a front-facing pose, left/right touch holds remain active across small pointer drift, and the first movement input clears chapter guidance from the playfield. APK badging reports `versionCode=14` / `versionName=1.6.1`.
- v1.6.2 — both protagonists begin facing right, retain the final explicit direction after stopping, and show complete idle heads; the launcher shows both Nini and Yuan under round and rounded-square masks. APK badging reports `versionCode=15` / `versionName=1.6.2`.
- v1.6.3 — Nini begins and stops facing forward-right on the default left-to-right route, while leftward stops still retain a left-facing idle. APK badging reports `versionCode=16` / `versionName=1.6.3`.
- v1.7.0 — World 3 HUD status shows a phase countdown, enemies expose quiet patrol or hover intent marks, and projectile hits show a short visual flash without changing physics or save data. APK badging reports `versionCode=17` / `versionName=1.7.0`.
- Current workspace — at 844 by 390, all five gameplay controls resolve between 64 and 84 CSS pixels, pause and back targets are at least 48 by 48, and the World 3 `星潮` countdown remains visible as a compact phase-critical chip.
- Current workspace — at 390 by 844, portrait guidance exposes a 48px-minimum `返回菜单` action; using it removes gameplay HUD and touch state and restores the menu without requiring device rotation.
- Current workspace — rapid volume, BGM, or touch-size slider movement previews immediately but produces no more than two local save writes for one continuous adjustment, with the final `change` value preserved after relaunch.
- Current workspace — pressing or holding Space or Enter on a menu or modal control never leaks a jump or projectile into the resumed level; settings ranges retain native arrow-key control; entering and leaving secondary screens moves focus only among visible elements.
- Current workspace — both characters accept a grounded jump within the first 100 ms of a chapter, and Nini retains her air jump after that opening ground jump.
- Current workspace — the Canvas playfield uses restrained ink-scroll parallax, gilt platform incisions, star-seal collectibles, grounded character shadows, and enlarged carved-material enemies without changing collision geometry.
