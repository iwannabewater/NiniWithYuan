# Design System

## Visual Direction

The visual direction is **Aurora Inkwash · Night Atlas Cinematic**: a hand-bound astronomical atlas, lit at midnight by drifting aurora. Dark indigo vellum, hairline gold cartography, jade and rose witch-light from Yuan and Nini, and warm ivory ink type.

The first viewport must identify three elements: the brushwork title that reveals on entry, the gold-cornered atlas panel framing, and the two characters glowing inside an aurora halo with static star-chart detail. The release avoids glassmorphism slabs, generic purple-blue gradients, default sans-serif headings, and decorative elements without gameplay meaning.

The visual language is built up in three orders of depth:

1. **Page ground** — vignette + constellation grid + static aurora veil with no full-screen blur.
2. **Panel** — ink-vellum gradient with a top-light gilded edge, hairline gold inner frame, and four atlas corner notches.
3. **Card** — character-tinted halo (rose for Nini, jade for Yuan), gold ring on selection, gentle lift on hover.

## Color Tokens

OKLCH-first values, with hex fallbacks for older renderers. Names are CSS custom properties.

| Group | Token | Use |
| --- | --- | --- |
| Night ramp | `--c-night-1000` … `--c-night-500` | 9-step page-to-chip ground |
| Gold | `--c-gold-100` … `--c-gold-600` | Vellum cartography rail, primary buttons, focus, emphasis |
| Jade | `--c-jade-300` … `--c-jade-600` | Yuan, skill-ready states |
| Rose | `--c-rose-300` … `--c-rose-600` | Nini, hearts, danger-soft |
| Aurora | `--c-aurora-cyan/-violet/-rose` | Pure decoration, gradient stops only |
| Cyan | `--c-cyan-400/500` | Wind, projectile, secondary effects |
| Ink | `--ink`, `--ink-soft`, `--ink-muted`, `--ink-subtle`, `--ink-strong` | Text |
| Status | `--c-danger`, `--c-success` | System states |

Surface tokens (`--panel`, `--panel-strong`, `--chip`, `--line`, `--line-strong`, `--hairline`) layer translucent inks over the night ramp.

## Typography

| Use | Family | Weight | Notes |
| --- | --- | --- | --- |
| Display title | LXGW WenKai Local | 700 | `text-wrap: balance`, slight letter-spacing, painted gradient clip |
| Headings, buttons, body | LXGW WenKai Local | 500 / 700 | `font-feature-settings: "palt", "kern"` |
| Eyebrow | LXGW WenKai Local | 700 | Pill chip, uppercase, 0.18em tracking |
| HUD numerals | LXGW WenKai Local | 500 | `font-variant-numeric: tabular-nums`, `"tnum"`, `"ss01"` |

The local subset files are `assets/fonts/lxgw-wenkai-500.woff2` and `assets/fonts/lxgw-wenkai-700.woff2` and are preloaded in `index.html`.

All DOM UI and Canvas float text use the same LXGW WenKai-led stack through `--font-ui`, `--font-canvas`, and `CANVAS_FONT_FAMILY`. The local 500/700 subsets are generated from the current runtime text surface, so chapter-select headings, world subtitles, modal copy, HUD labels, Canvas float text, and easter-egg messages do not fall back mid-phrase for missing Chinese glyphs. Current user-facing scope copy avoids hard-coded chapter counts, so menu metadata, ambient-strip text, and easter eggs do not drift when future chapters are added.

## Components

### Panels

Panels are 20 px radius, ink-vellum gradient, with gold hairline inner frame and four atlas corner notches. Top-light specular hints at gilded book edges. Panels and HUD surfaces use opaque/translucent fills and shadows instead of `backdrop-filter` so the WebView renderer avoids live background sampling.

### Buttons

- **Primary** uses a layered gold gradient with inner specular and gold drop-glow, dark text, 700 weight.
- **Secondary** uses a translucent night surface with gold hairline on hover.
- **Danger** uses a desaturated rose surface.
- **Active** uses `translateY(2px) scale(0.97)`.
- **Hover** lifts 1 px and lights with a gold halo.

### HUD

Pills are pill-shaped with translucent night fill, hairline edge, and tabular numerals. The character pill is gold; hearts are rose; the skill pill carries a jade (ready) or gold (cooling) underline ribbon. The pause button is a pill icon. Mobile landscape collapses pill heights and hides the status pill.

### Chapter Cards

The chapter grid is grouped by world headings. World 1 / 破碎星图 contains the original five chapters, World 2 / 星门群岛 contains five star-gate chapters, and World 3 / 星潮镜域 contains five phase-tide chapters. Headings use a slim gilded divider and compact subtitle so the grid reads as an atlas table of contents without becoming a marketing section.

The featured chapter carries an **atlas compass** — a gold conic ring that rotates at 18 s per revolution and a four-point compass mark (`✦`) at its core. Locked chapters dim by opacity rather than CSS filters. Hover lifts and brightens. On grid hover, a hairline **meridian rail** (a single decorative `.level-list::after`) traces between the ordinary chapters and the featured chapter, surfacing the level grid as one inked map without any DOM-shape change.

The chapter score line is built from three readable groups: filled stars set in `--c-gold-200` with a soft gold halo, empty stars dropped to a low-contrast ivory tint, and the best-time value rendered in tabular gold (`<strong class="level-best-value">`) so the metric stays legible against the ink-vellum surface. Locked chapters drop the gold tint to a near-white muted tone to keep visual hierarchy without reusing the live state.

### Star Gates

Star gates are canvas-native gameplay objects in World 2. They use paired cyan/gold/rose rings with a soft inner field and a short activation flare. Their rendering is intentionally readable at gameplay scale: the ring sits in front of the background, behind the player, and avoids dense decorative strokes that could be mistaken for hazards. The HUD status pill appends `星门` briefly after travel, matching the existing wind and power-up state language.

### Phase-Tide Bridges

Phase-tide bridges are canvas-native World 3 objects. Active phase bridges use cold cyan / jade mirror-water fills and participate in collision; inactive phase objects render as translucent dashed silhouettes so the player can read the next route before it becomes solid. The level background adds a subtle vertical tide-line motif during World 3 chapters, and the HUD status pill reports `星潮 甲相` or `星潮 乙相` while the tide clock is active.

### Ambient Side Layer

Outside the central panel, three fixed decorative regions reclaim the empty viewport zones for menu surfaces only and disappear during gameplay:

- `.ambient-left` and `.ambient-right` — vertical aurora streamers, three drifting calligraphic rune marks per side (gold, jade, rose) at low opacity, three twinkling sparks, and a small connected six-star constellation glyph on the right.
- `.ambient-strip` — a hairline-divided footer placard with a gold star mark, a version-and-scope chip in caps, a rotating star-quote line (italic ink-soft), and a copyright credit.

Visibility is gated by `body:has(.screen.active)` and forced off immediately under `body:has(.hud.active)`. The layer sits above the full-screen attract canvas and below the menu panels, HUD, modal, and love overlays. Mobile portrait hides the side rails; mobile landscape keeps a compact strip. Reduced-motion stops all decorative ambient animation.

### Touch Controls

Each touch button is a 50 % radius coin with a tactile inner specular and a deep drop shadow. The jump, skill, and shoot buttons emit a slow breath-pulse aura when ready (paused under reduced-motion). Press collapses the button and lights a gold halo.

Each action button also carries a refined inline-SVG glyph mark above its label (jump → star arrow, skill → aurora swirl, shoot → diamond burst). The glyph is rendered via `mask-image: url("data:image/svg+xml,…")` and `background-color: currentColor`, so it inherits the button's gradient and adds no asset payload to the service worker cache.

### Pause and Completion Modal

The modal card carries a paper grain layer (a low-opacity `feTurbulence` SVG-data-URL noise blended `overlay`) and a 56 px gold **atlas seal** in the lower-right corner that breathes gently at 9 s. The seal uses a conic gradient mixing gold, rose, jade, and cyan and is masked into a circular form with a hairline rim, mirroring the cartography rail aesthetic. Reduced-motion stills the seal.

### Settings Panel

Each settings row carries a `data-rune` attribute (♪ / ♬ / ◐ / ✦) that the CSS reads via `attr()` to render a 22 px gold rune chip with a hairline ribbon stub leading into the row. The rune chip is decorative; the underlying input IDs, names, and `for` linkage are unchanged so existing accessibility scans and the storage path remain green.

### HUD Pulses

`.hud-pill.character` and `.hud-pill.skill-state` pulse once via the `hud-pulse` 420 ms keyframe whenever the character name actually flips or the skill `cooling` state actually flips. The pulse is fired by a `pulseHudPill` helper exposed from `src/render/hud.js`, which `src/game.js` calls from `updateHud` only when the cached previous value differs from the current value. Reduced-motion replaces the keyframe with no animation so the pill remains visually stable.

### Bossbar

The chapter progress bar (`.bossbar span`) carries a layered auroral wash (`cyan → jade → gold → rose` over a `200 %` background) animated by `bossbar-shimmer` at 7 s linear, plus a soft leading-edge gleam pseudo at the 100 % end. Width still transitions over `var(--d-base)` so the existing game-loop progress wiring remains untouched. Reduced-motion forces the shimmer off and zeroes the gleam opacity.

## Layout

Desktop menus use a two-column structure: title and actions on the left, character presentation on the right. Mobile portrait places character presentation above title and actions. Mobile landscape restores a compact two-column structure and reduces the HUD, chapter intro, and touch controls so gameplay visibility is preserved. Chapter cards keep their copy pinned to a consistent left edge even though they are implemented as buttons.

Fixed controls account for safe areas (`env(safe-area-inset-*)`). Touch buttons render between roughly 72 px (landscape) and 140 px (user maximum). The CSS variable `--touch-size` is JS-controlled at runtime from save settings.

## Motion

Motion uses `transform` and `opacity`. Expensive full-screen animated filters, masks, and backdrop sampling are intentionally avoided. Keyframes:

- `screen-enter` — panel entry, 480 ms.
- `brand-reveal` — title brushwork reveal on first menu, 1.1 s.
- `touch-breath` — touch action button aura, 3.2 s ease-in-out infinite.
- `modal-pop` — modal card entry, spring 360 ms.
- `ambient-drift` — calligraphic rune slow drift, 18 s ease-soft infinite.
- `ambient-twinkle` — spark and gold-mark scale-and-opacity blink, 4.6 s ease-soft infinite.
- `ambient-constellation-pulse` — connected six-star glyph pulse, 8 s ease-soft infinite.
- `cursor-spark-fade` — pointer stardust trail particle lift-and-fade, 960 ms ease-out forwards.
- `love-heart-beat` — easter-egg constellation heart, 1.6 s ease-soft infinite while shown.
- `compass-rotate` — featured-chapter atlas compass, 18 s linear infinite (paused under reduced-motion).
- `aurora-sweep` — sub-aurora brushwork under the wordmark, 1.4 s ease-out 220 ms forwards (hidden under reduced-motion).
- `hud-pulse` — one-shot 420 ms ink-bloom on character/skill HUD pills.
- `bossbar-shimmer` — bossbar auroral wash, 7 s linear infinite.
- `bossbar-rise` and `tips-rise` — chapter intro orchestration entrance, 420 ms / 480 ms ease-out.
- `hero-breath` — touch-only cover-hero tilt, 7 s ease-soft infinite.
- `seal-breathe` — modal atlas seal pulse, 9 s ease-soft infinite.
- `spark-lit` — constellation-hunt spark feedback, 1.4 s ease-soft forwards.

The pointer stardust layer is a fixed full-viewport overlay above the active menu panel, with pointer events disabled. It is scoped by JS to pointer movement over `.menu-heroes` and `#menu .brand h1`, interpolates particles along fast movement so the trail stays continuous, and lets particles escape their source boxes without affecting gameplay hit targets.

High-frequency interaction targets disable text selection and WebKit touch callout: buttons, the long-press title, the hero cover, and touch controls. Ordinary descriptive copy remains selectable.

Under `prefers-reduced-motion: reduce`, animation and transition durations collapse to ~0 ms; touch breath is hidden and the aurora remains static.

Under `prefers-contrast: more`, hairlines, ink, and button rims tighten and darken for readability.

## Constraints

- No UI framework, no bundler, no JS dependency added.
- No generic purple-blue marketing hero.
- No default sans-serif title treatment.
- No instructional prose inside the gameplay interface beyond necessary labels.
- No heavy animation library in the WebView runtime — motion is CSS-only and limited to small surfaces.
- Selectors, IDs, classes, button text, data attributes, and the `--touch-size` custom property remain byte-stable so `src/game.js`, the test suite, and the Android wrapper continue to work without code changes.
