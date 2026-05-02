# Design System

## Visual Direction

The visual direction is a night atlas: dark blue ground, gold cartographic lines, jade energy for Yuan, rose energy for Nini, and warm ivory text. The interface should read as a functional fantasy map rather than a generic game template.

The first viewport must identify three elements: brush-like title typography, the two-character presentation, and gold-lined panels. The release should avoid glassmorphism, broad purple gradients, and decorative elements without gameplay relevance.

## Color Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--c-night-950` | `#070b18` | Deepest background |
| `--c-night-900` | `#0b1024` | Page ground |
| `--c-night-840` | `#101731` | Panel ground |
| `--c-night-780` | `#17203d` | Card ground |
| `--c-gold-400` | `#f2d389` | Atlas lines, emphasis text, focus |
| `--c-gold-500` | `#d9b66a` | Gold borders |
| `--c-jade-500` | `#5dd4a8` | Yuan and skill-ready states |
| `--c-rose-500` | `#f08ab0` | Nini and health states |
| `--c-cyan-500` | `#5fcdf2` | Wind, star shots, and Yuan secondary effects |

CSS retains hex fallbacks and switches to OKLCH tokens in browsers that support `oklch()`.

## Typography

| Use | Family | Weight |
| --- | --- | --- |
| Title, buttons, HUD | LXGW WenKai Local | 700 / 500 |
| Fallback | LXGW WenKai, Noto Serif SC, Noto Sans SC, PingFang SC, system-ui | 500 |

The local subset files are `assets/fonts/lxgw-wenkai-500.woff2` and `assets/fonts/lxgw-wenkai-700.woff2`. New large text additions should trigger a font subset review.

## Components

### Panels

Panels use an 8 px maximum radius, a dark blue ground, inset gold linework, and minimal texture. Large panel nesting is avoided. Repeated information may use small chips when the chip carries distinct state.

### Buttons

Primary buttons use a gold surface and dark text. Secondary buttons use low-luminance night surfaces. Hover states use small translation and gold emphasis. Active states use `translateY(2px) scale(0.97)`.

### HUD

The HUD is optimized for scan speed. Health uses hearts, starlight uses `✦`, ammunition uses `◆`, and time uses tabular numbers. Mobile layouts may wrap the HUD, but HUD content must not block touch controls.

### Chapter Cards

Chapter selection presents the nearest available chapter as the featured item and lists other chapters in a compact form. The featured item derives its banner from the chapter palette.

## Layout

Desktop menus use a two-column structure: title and actions on the left, character presentation on the right. Mobile portrait places character presentation above title and actions. Mobile landscape restores a compact two-column structure and reduces the HUD, chapter intro, and touch controls to protect gameplay visibility.

Fixed controls must account for safe areas. Touch buttons should not render below a 40 px visible size; the current mobile range is approximately 72-82 px.

## Motion

Motion uses `transform` and `opacity`. Screen entry, button press, chapter intro, modal entry, and selected particle effects are permitted. Under `prefers-reduced-motion: reduce`, CSS transition and animation durations collapse to near zero.

## Constraints

- No UI framework.
- No generic purple-blue gradient hero.
- No default sans-serif title treatment.
- No instructional prose inside the gameplay interface beyond necessary labels.
- No heavy animation library in the WebView runtime.
