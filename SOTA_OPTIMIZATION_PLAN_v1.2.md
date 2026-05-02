# State-of-the-Art Optimization Plan and Completion Record — v1.2.0

Version scope: `v1.1.0` to `v1.2.0`
Baseline commit: `dd847cc`
Drafted: 2026-05-02
Completion date: 2026-05-02
Repository: `iwannabewater/NiniWithYuan`

## Objective

The v1.2.0 release is a pure visual-and-experience pass. No gameplay logic, save schema, physics, audio routing, controller binding, screen flow, or chapter content is touched. The release elevates the existing **Nightbound Stellar Atlas** direction into an artistic, production-grade interface comparable to or exceeding contemporary mobile/web game shells (Honkai: Star Rail menus, Hades narrative UI, Sky's translucent layered cards, Cult of the Lamb's tactile buttons).

The web build and the Android WebView build share `index.html`/`styles.css`, so a single front-end pass updates both surfaces.

## Non-Goals

- No new chapters, characters, items, enemies, or balance numbers.
- No save schema migration (still `nini-yuan-save-v1`, schema version 2).
- No JavaScript framework, bundler, or build-tool change.
- No new runtime dependencies.
- No Android Java/Kotlin behavior change beyond cosmetic splash/background colors.

## Direction Lock — "Aurora Inkwash · Night Atlas Cinematic"

A single phrase: **dark cartographic spellbook lit by aurora**, with brushwork ink details, hairline gold cartography, and warm character glow.

| Property | Decision |
| --- | --- |
| Mood | Hand-bound astronomical atlas, mid-night, witnessed by aurora. |
| Material | Inked vellum on indigo glass; gold leaf hairlines; jade and rose witch-light. |
| Energy | Patient, deep, breathing. Energy concentrates in characters, not chrome. |
| Typeface (display) | LXGW WenKai 700 (kept) with new tracking, and an English eyebrow set in a tight monospace-feel cap (using `font-feature-settings: "ss01"` and letter-spacing). |
| Surface depth | Three orders: 1) static viewport vignette + faint constellation field, 2) panel ink-vellum with gold hairlines, 3) interactive cards with character-tinted aurora halos. |
| Accent color logic | `--c-rose-*` for Nini, `--c-jade-*` for Yuan; gold (`--c-gold-*`) is the system rail (lines, focus, primary). |
| Signature micro-interactions | (1) Brush-stroke title reveal on first menu entry. (2) Character cards glow on hover/focus/selected. (3) Featured chapter carries a static atlas ring. (4) Touch buttons emit a slower breath-pulse when ready. (5) HUD pills use fast transform/opacity transitions only. |

### Three-line thesis

- **Visual thesis**: a moonlit spellbook unfolded into the screen — vellum panels, gold cartography, aurora glow, brushwork letterforms.
- **Content plan**: orient (brand + save state) → choose (characters → chapters → settings) → play (HUD scoped to game). No marketing hero, this is a utility shell.
- **Interaction thesis**: characters glow, chapters breathe, controls confirm with tactile depth — chrome stays patient.

## Scope

### Visual layer — `styles.css` rewrite

- Token system organized in CSS cascade layers (`@layer reset, tokens, base, components, utilities`).
- New OKLCH-first palette with hex fallback, expanded into a 9-step night ramp and 6-step accent ramps.
- Typography: paired display (LXGW WenKai 700) + body (LXGW WenKai 500) + small-caps eyebrow stack.
- Performance-tuned visual layer: no full-screen animated blur, no `backdrop-filter`, no CSS masks/filters for routine states, and no `@property` animation dependency.
- Three-layer ambient backdrop: night gradient → constellation noise → static aurora ribbons.
- New panel surface: ink-vellum gradient, hairline gold inset, soft inner glow, and a deliberate top-light spec that mimics gilded book edges.
- Re-typeset HUD pills with refined hairlines, accent glyph wells, and shimmer-on-change.
- Re-styled menu, character grid, level grid, settings, modal, touch controls — preserving every DOM ID, class, and label that game.js or tests depend on.
- Mobile portrait/landscape and 430-wide handset rules updated to keep the same safe layout invariants the smoke tests assert.

### Structural layer — `index.html` (additive only)

- Add only metadata and font preloads; the existing DOM structure and game.js querySelectors remain stable.
- Keep `aria-label`, `data-action`, `data-pick`, `data-touch`, button text content, and IDs byte-stable.
- Add `<meta name="color-scheme" content="dark">` and an updated `theme-color`.
- Pre-load both display and body font subsets explicitly.

### Android side

- Update `MainActivity.java` splash background color and tip color to match the refined palette (no API change).
- Update `styles.xml` window background and accent.
- Bump `versionCode` to 3 and `versionName` to `1.2.0`.

### Service worker

- Bump cache name to `nini-yuan-v1.2.0-aurora` so returning users pick up the new bundle.

### Documentation

- Update `docs/DESIGN.md` with the v1.2 ramp, layered backdrop, signature interactions.
- Update `docs/MOTION.md` with the five signature micro-interactions and timing tokens.
- Update `CHANGELOG.md` and `README.md` headline.
- Bump `package.json` version to `1.2.0`.

## What stays exactly the same

| Surface | Why |
| --- | --- |
| `src/core/*`, `src/render/hud.js` | Persistence, audio, and HUD render APIs remain unchanged. |
| `src/game.js` gameplay logic | Gameplay, physics, levels, input, audio routing, and save behavior remain unchanged; only the non-play menu attract renderer drops duplicated giant character draws. |
| Save schema and IDs | Tampering recovery test pins the exact sanitized values. |
| Button text content (e.g. "继续冒险", "选择关卡", "跳", "技", "弹") | Smoke tests, accessibility tests, and `getByText/getByRole` selectors. |
| Container DOM IDs (`menu`, `overlay`, `modal`, `hudCharacter`, …) | Hardcoded throughout game.js. |
| `--touch-size` custom property and the 60–140 range | storage tampering test asserts the sanitized value lands in CSS. |
| `.character-card.selected`, `.touch-btn`, `.menu-actions`, `.menu-heroes`, `.top-hud > *`, `.panel`, `.modal.active`, `#chapterIntro.active` | Direct test assertions and JS class toggles. |
| Mobile landscape invariants | smoke test enforces panel within viewport, hero within panel, single-row menu actions, HUD bottom above touch top, control-tips hidden, intro within viewport, bossbar within viewport. |
| Audio, lifecycle, service worker registration logic | Out of scope. |

## Verification Targets

```bash
npm test
npm run build:android
```

Expected output:

```text
dist/NiniYuan.apk
```

Plus a manual desktop / 390×844 portrait / 844×390 landscape browser pass.

## Acceptance Criteria

- Brand-unmistakable first viewport on web and Android.
- No regression in any `npm test` check, including:
  - `physics-balance`, `mechanics-balance`, `storage` unit, `character-atlas`,
  - `docs-links`, `render-touch-polish`, `ci-workflows`, `android-wrapper`,
  - `audio-bgm`, `pwa-assets`,
  - all four `tests/e2e/*.js` suites,
  - `tests/browser-smoke.js` (5 scenarios).
- WCAG 2A/2AA — no serious or critical violations across menu, characters, levels, settings, game HUD.
- The Android APK builds and the WebView background colors match the new palette during splash.
- Reduced-motion users still get instant transitions; aurora is static by default and touch breath is hidden.

## Release Steps

1. Implement the visual rewrite and DOM additions.
2. Sync `android/app/src/main/assets/` via `npm run build:android` (the build script copies the source tree).
3. Run `npm test` and fix any regression locally.
4. Update docs, changelog, version numbers.
5. Commit `feat(ui): aurora inkwash visual pass for v1.2.0`.
6. Tag `v1.2.0` and push.

## Completion Record

### Verification

- `npm test` — full local test matrix passes:
  - JS syntax (`storage`, `audio`, `hud`, `game`, `service-worker`)
  - `physics-balance`, `mechanics-balance`, `unit/storage.test`, `character-atlas`
  - `docs-links`, `render-touch-polish`, `ci-workflows`, `android-wrapper`
  - `audio-bgm`, `pwa-assets`
  - `e2e/lifecycle`, `e2e/save-tampering`, `e2e/pwa-registration`, `e2e/accessibility`
  - `browser-smoke` — 5 scenarios (desktop gameplay, roundRect fallback, storage unavailable, mobile portrait controls, mobile landscape menu + gameplay)
- `npm run build:android` — `dist/NiniYuan.apk` produced at 6.0 MB, signed and verified.
  - `versionCode=3`, `versionName=1.2.0`, `compileSdkVersion=36`, `min-sdk-version=23`.
  - APK assets contain the rewritten `styles.css`, updated `index.html`, and the bumped `service-worker.js` cache name `nini-yuan-v1.2.0-aurora`.

### Visual capture

Screenshots at desktop 1280×720, mobile portrait 390×844, and mobile landscape 844×390 confirm:

- Brand title brushwork reveal renders without clipping at all three viewports.
- Menu backdrop no longer draws duplicated giant Canvas character art behind the panel.
- Character cards show character-tinted aurora halos with a gold "已选定" badge on the selected card.
- Featured chapter card shows the static atlas ring and star core.
- Settings cards present each control as an inset chip with a clear gold accent slider.
- HUD pills carry hairline edges with tabular numerals; the chapter intro renders within bounds and above touch controls.
- Modal cards carry the gold corner notches and primary `继续` button glow without live backdrop blur.
- Touch buttons display jump (gold), skill (cyan-jade), and shoot (gold-rose) gradients with breath-pulse aura when ready.
- Mobile landscape menu fits panel within viewport with single-row actions, hero deck within panel bounds, and hidden control-tips during gameplay.
- Browser `requestAnimationFrame` sampling on desktop, 390 x 844 portrait, and 844 x 390 landscape held near 16.7 ms frames after the heavy CSS effects were removed.

### Compliance with the v1.1 contract

- `--touch-size` custom property still observed by `tests/e2e/save-tampering.js` after JS sanitization (140 px clamp).
- `.character-card.selected[data-character="yuan"]` still styles correctly when storage is unavailable.
- Mobile landscape gameplay invariants (HUD bottom above touch top, intro within viewport, bossbar within viewport, control-tips hidden) all hold.
- `accessibility-e2e` reports no serious or critical WCAG 2A/2AA violations across menu, character, level, settings, and HUD scans.

### Residual notes

- Decorative aurora and atlas-ring treatments are static so older WebView builds do not need `@property` support.
- Full-screen blur, routine `filter`, CSS masks, and `backdrop-filter` were removed from the release path to keep WebView compositing cost bounded.
- Manual emulator validation remains useful before store submission to verify device-specific WebView, orientation, icon mask, and audio-focus behavior.
