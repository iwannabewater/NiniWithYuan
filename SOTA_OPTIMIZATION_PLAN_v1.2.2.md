# Menu Polish Release Record - v1.2.2

Version scope: `v1.2.1` to `v1.2.2`
Baseline commit: `7ec30d6`
Date: 2026-05-03
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.2.2 release is a small menu polish update. It keeps the v1.2.1 gameplay fixes, save schema, audio routing, screen flow, chapter content, and Android WebView behavior intact. The scope is limited to three presentation issues:

- replace the main-menu subtitle phrase that described the game as a platform jump title;
- align chapter-card copy consistently across the first four chapter cards;
- add low-cost cover detail so the first screen feels richer without crowding the character artwork.

## Scope

### Menu Copy

- Update the visible main-menu subtitle to `双角色星图冒险 · 五大章节 · 自动存档`.
- Update the HTML description metadata with the same star-atlas adventure language.

### Chapter Cards

- Keep chapter items implemented as buttons.
- Add explicit level-card copy classes in `src/render/hud.js`.
- Override the global button centering behavior for `.level-item` so copy and score metadata pin to a consistent left edge.

### Cover Detail

- Add static star-chart points and hairline tracery inside `.menu-heroes::after`.
- Keep the effect CSS-only, non-animated, and asset-free.

### Versioning and Docs

- Bump `package.json` and `package-lock.json` to `1.2.2`.
- Bump Android `versionCode` to 5 and `versionName` to `1.2.2`.
- Bump the service worker cache to `nini-yuan-v1.2.2-menu-polish`.
- Update README, CHANGELOG, DESIGN, MOTION, GDD, and Android manual testing notes.

## Non-Goals

- No gameplay, physics, level, save, audio, or Android native behavior changes.
- No new dependencies.
- No new art assets or generated images.
- No layout rewrite beyond the affected menu and chapter-card surfaces.

## Verification

- `npm test` passed on 2026-05-03.
  - Includes the expanded browser smoke check for main-menu copy, cover star-chart detail, and first-four-chapter text alignment.
- `npm run build:android` passed on 2026-05-03 and produced `dist/NiniYuan.apk`.
- APK badging confirms `versionCode=5`, `versionName=1.2.2`, `compileSdkVersion=36`, `min-sdk-version=23`, and `targetSdkVersion=36`.
- APK assets contain the updated main-menu subtitle, CSS star-chart detail, and left-aligned level-card CSS.

## Manual Review Notes

- Main-menu subtitle should read as star-atlas adventure copy, not as generic platform-jump copy.
- The first four chapter cards should start chapter title, vibe, hint, and score metadata from the same internal left edge.
- Cover detail should remain secondary to the character cards and should not add motion or visual crowding.
