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

The featured chapter carries a static atlas ring and a star at its core. Locked chapters dim by opacity rather than CSS filters. Hover lifts and brightens.

### Touch Controls

Each touch button is a 50 % radius coin with a tactile inner specular and a deep drop shadow. The jump, skill, and shoot buttons emit a slow breath-pulse aura when ready (paused under reduced-motion). Press collapses the button and lights a gold halo.

## Layout

Desktop menus use a two-column structure: title and actions on the left, character presentation on the right. Mobile portrait places character presentation above title and actions. Mobile landscape restores a compact two-column structure and reduces the HUD, chapter intro, and touch controls so gameplay visibility is preserved. Chapter cards keep their copy pinned to a consistent left edge even though they are implemented as buttons.

Fixed controls account for safe areas (`env(safe-area-inset-*)`). Touch buttons render between roughly 72 px (landscape) and 140 px (user maximum). The CSS variable `--touch-size` is JS-controlled at runtime from save settings.

## Motion

Motion uses `transform` and `opacity`. Expensive full-screen animated filters, masks, and backdrop sampling are intentionally avoided. Keyframes:

- `screen-enter` — panel entry, 480 ms.
- `brand-reveal` — title brushwork reveal on first menu, 1.1 s.
- `touch-breath` — touch action button aura, 3.2 s ease-in-out infinite.
- `modal-pop` — modal card entry, spring 360 ms.

Under `prefers-reduced-motion: reduce`, animation and transition durations collapse to ~0 ms; touch breath is hidden and the aurora remains static.

Under `prefers-contrast: more`, hairlines, ink, and button rims tighten and darken for readability.

## Constraints

- No UI framework, no bundler, no JS dependency added.
- No generic purple-blue marketing hero.
- No default sans-serif title treatment.
- No instructional prose inside the gameplay interface beyond necessary labels.
- No heavy animation library in the WebView runtime — motion is CSS-only and limited to small surfaces.
- Selectors, IDs, classes, button text, data attributes, and the `--touch-size` custom property remain byte-stable so `src/game.js`, the test suite, and the Android wrapper continue to work without code changes.
