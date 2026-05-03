# Typography and Copy Bugfix Plan - v1.3.1

Version scope: `v1.3.0` to `v1.3.1`
Baseline commit: `70cedcf`
Date: 2026-05-03
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.3.1 release is a focused bugfix on top of the World 2 expansion. It keeps gameplay, level geometry, save schema, Android wrapper behavior, audio routing, and the v1.2.x visual shell intact. The release fixes typography drift and current-scope copy that became visible after v1.3.0 added new world and chapter text.

Primary issues:

- Chapter select could render mixed Chinese fonts inside the same phrase, especially `五枚心石碎片`, `星门重新接合路线`, `星门浅湾`, `回环灯塔`, and `星环温室`.
- Canvas float text still used a hard-coded `system-ui` stack instead of the DOM UI's WenKai-led stack.
- Some current-facing UI and easter-egg copy still described the game by a fixed chapter count, which would drift again after future content expansion.
- Several easter-egg labels/toasts used English-only phrasing inside an otherwise Chinese romantic UI layer.

## Diagnosis

Root cause: the local `assets/fonts/lxgw-wenkai-500.woff2` and `assets/fonts/lxgw-wenkai-700.woff2` files were early subsets. They did not include new v1.3.0 glyphs such as `枚`, `门`, `湾`, `灯`, `塔`, and `温`, so Chromium/WebView fell back to the next font in the stack for those characters. This produced visible mixed-font phrases even when CSS inheritance was otherwise correct.

Secondary cause: `src/game.js` still assigned Canvas float text with `system-ui, sans-serif`, so pickup, star-gate, and combat float text did not share the DOM typography.

## Scope

### Font and CSS

- Regenerate both local LXGW WenKai subsets from the full `@fontsource/lxgw-wenkai` source font using the current runtime text surface.
- Keep the assets lightweight by subsetting to current HTML, CSS, HUD, gameplay, and easter-egg text rather than shipping the full multi-megabyte source font.
- Define shared `--font-ui` and `--font-canvas` tokens and apply the UI token to body, buttons, and inputs.

### Canvas Text

- Add `CANVAS_FONT_FAMILY` in `src/game.js`.
- Use it for regular and gilded Canvas float text.

### Copy

- Replace current-facing `五大章节` / `八大章节` / `五个章节` style copy with `多世界章节` where the phrase describes the current product scope.
- Keep historical release records and World 1 fiction intact when they intentionally describe past scope or story content.
- Localize easter-egg eyebrows and toasts that appear in the Chinese UI layer.

### Tests

- Add `tests/typography-copy-v1_3_1.js`.
- Guard package/cache/Android v1.3.1 metadata.
- Guard shared font-stack usage and Canvas font usage.
- Guard count-free current UI/easter-egg copy.
- Parse the local WOFF2 `cmap` table and assert every current runtime Chinese character is covered by both local font weights.

## Non-Goals

- No gameplay, physics, save schema, chapter geometry, audio, or Android native behavior change.
- No new runtime dependency, framework, bundler, analytics, network call, or online storage.
- No replacement of decorative icon glyphs such as hearts or star marks; those remain symbols and may use the browser's symbol fallback.

## Verification Targets

```bash
npm test
npm run build:android
```

Expected APK output:

```text
dist/NiniYuan.apk
```

Manual review should open the main menu, chapter select, character select, settings, pause/completion modals, and all hidden Yuan-to-Nini surprises. Confirm Chinese text no longer mixes font styles mid-phrase and current-scope copy reads `多世界章节` instead of a fixed chapter count.

## Completion Record

### Verification

- `npm test` passed locally on 2026-05-03.
  - Includes the new `tests/typography-copy-v1_3_1.js` guard for shared font stacks, Canvas font usage, count-free current UI/easter-egg copy, and WOFF2 `cmap` coverage for every current runtime Chinese glyph.
  - The full browser smoke suite passed across the existing six scenarios.
- `npm run build:android` passed locally on 2026-05-03 and produced `dist/NiniYuan.apk`.
  - APK badging: `versionCode=9`, `versionName=1.3.1`, `compileSdkVersion=36`, `min-sdk-version=23`, `targetSdkVersion=36`.
  - APK assets contain the rebuilt local WenKai subset files at `assets/assets/fonts/lxgw-wenkai-500.woff2` and `assets/assets/fonts/lxgw-wenkai-700.woff2`.

### Residual Notes

- The Android build still emits the existing JDK restricted-native-access warnings from the SDK `apksigner` Conscrypt path; signing and verification complete successfully.
- Decorative symbol glyphs such as `✦`, `❤`, `❦`, `◐`, and `⏱` are not part of the WenKai source font and may use the browser's symbol fallback. The v1.3.1 fix targets Chinese text fallback inside readable phrases.
- User review approved the v1.3.1 bugfix for commit, tag, GitHub push, and release publication on 2026-05-03.
