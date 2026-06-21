# Design System

## 1. Visual Theme and Atmosphere

The canonical direction is **宋式星图器物幻想**: a quiet night observatory expressed through Song-informed garment construction, astronomical charts, black-indigo lacquer, deep indigo silk, carved jade, aged gilt incision, and shallow relief. The interface should feel made, handled, and inherited rather than rendered from generic fantasy UI parts.

The first screen follows **双璧入卷**. Nini and Yuan appear together as equal leads inside one authored composition; the Xuanji Star Dial supplies the circular axis and the Jade Gui Sword supplies the vertical axis. Ornament is concentrated at the hero frame, signature artifacts, brand seal, and decisive states. Ordinary controls remain quiet.

Three implementation theses govern the work:

- **Visual thesis**: 夜观天象, museum-lit lacquer and silk with restrained rose and jade inlay.
- **Content thesis**: orient through the paired protagonists, expose the current journey state, then provide one clear action rail.
- **Interaction thesis**: **刻金显纹** traces an aged-gold edge on focus or confirmation, then settles a rose or jade inlay; motion never turns an entire surface into glow.

## 2. Color Palette and Roles

CSS is OKLCH-first with hex fallbacks. Sixty percent of visible weight comes from lacquer and silk neutrals, thirty percent from moon-white type and aged-gold structure, and at most ten percent from character inlays.

| Token | Fallback | Role |
| --- | --- | --- |
| `--c-lacquer` | `#0b1016` | Page and gameplay surround |
| `--c-lacquer-raised` | `#111821` | Raised lacquer planes |
| `--c-indigo-silk` | `#18212d` | Main panels and quiet controls |
| `--c-indigo-silk-raised` | `#202c3a` | Selected and elevated surfaces |
| `--c-moon-white` | `#eee7d5` | Primary text |
| `--c-ink-soft` | `#c6bfae` | Secondary text |
| `--c-ink-muted` | `#948f83` | Metadata and disabled text |
| `--c-aged-gold` | `#c3a468` | Structure, focus, progress, confirmation |
| `--c-aged-gold-deep` | `#80683f` | Inset edges and inactive gold |
| `--c-carved-jade` | `#6da895` | Yuan, skill-ready, success |
| `--c-dusty-rose` | `#b87b86` | Nini, health, tender states |
| `--c-danger` | `#b85f65` | Destructive states only |

Do not use generic purple-to-blue gradients, neon cyan on dark, full-white text, or gray text detached from the surface hue.

## 3. Typography Rules

The user-selected type system keeps **LXGW WenKai Local** globally. Ancient character therefore comes from composition, scale, spacing, and material rather than a second display family.

| Use | Size | Weight | Line height | Notes |
| --- | --- | --- | --- | --- |
| Brand title | `clamp(52px, 7vw, 94px)` | 700 | 0.96 | Solid moon-white and aged gold, no gradient clip |
| Screen heading | `clamp(28px, 3vw, 42px)` | 700 | 1.12 | Balanced wrapping |
| Control | 15 to 18px | 700 | 1.2 | Stable size across states |
| Body | 15 to 17px | 500 | 1.7 | CJK reading rhythm |
| HUD number | 13 to 16px | 700 | 1 | Tabular numerals |
| Inscription | 11 to 12px | 700 | 1.3 | Up to `0.12em` tracking |

CJK display text does not receive negative tracking. English inscriptions may use restrained positive tracking. All visible Chinese copy remains covered by local font subsets.

## 4. Component Styling

### Buttons

Buttons are low-radius lacquer keys with cut or incised corners, not pills. Default state uses indigo silk and one quiet inset line. Hover and focus reveal a short aged-gold trace. Active state uses `scale(0.97)` without bounce. The primary action may use a solid aged-gold face with lacquer text. Destructive actions use dusty red only after intent is clear.

### Panels

Panels use black-indigo lacquer outside and deep indigo silk inside. Depth comes from luminance steps, one inset highlight, one carved inner frame, and sparse corner joinery. No `backdrop-filter`, frosted glass, or generic rounded card grid.

### Character presentation

The menu uses one paired composition. Character selection derives two deliberate crops from the same approved direction until production individual portraits are available. Nini keeps purple hair, rose identity, and the Xuanji Star Dial; Yuan keeps deep-blue hair, jade-cyan identity, and the Jade Gui Sword. Both read as fictional adults aged 20 to 24.

### Application icon

Web/PWA and Android launchers use the same close paired portrait of Nini and Yuan. Both adult faces remain recognizable and inside circular, rounded-square, and Android adaptive safe zones; neither protagonist may be replaced by a standalone artifact emblem. The Xuanji Union Seal remains available as an in-product symbolic mark, not as the launcher identity.

### HUD

Gameplay follows **四角仪轨**. Character seal and health anchor the upper left; resource, ammunition, skill, and pause anchor the upper right; the chapter progress line stays narrow along the top meridian. Information does not form one continuous pill row.

### Touch controls

Mobile uses **星盘双区**. Direction lives in a low-contrast left star-dial crescent; jump, skill, and shoot use three differentiated jade or lacquer seals on the right. Visible controls stay smaller than their non-overlapping hit areas. Gameplay is landscape-only; portrait menus remain fully usable.

## 5. Layout Principles

The spacing scale is `4, 8, 12, 16, 24, 32, 48, 64`. Main panels use a 12-column mental grid without shipping grid utilities. Desktop menu allocation is approximately 5 columns for title and actions, 7 for the paired art. Secondary screens favor vertical inscriptions and content-specific layouts rather than interchangeable cards.

Radius tokens are:

- `--r-incised: 2px`
- `--r-control: 6px`
- `--r-panel: 14px`
- `--r-seal: 999px`, only for literal seals, dials, HUD markers, and touch controls

## 6. Depth and Elevation

- Ground: solid `--c-lacquer`.
- Raised lacquer: `--c-lacquer-raised` plus a two-percent moon-white overlay.
- Silk panel: `--c-indigo-silk` plus an inset aged-gold line.
- Selected artifact: one luminance step, one gilt trace, and character-color inlay.
- Modal: stronger lacquer plane and restrained surrounding veil, never blur sampling.

Dark shadows alone do not establish hierarchy. Adjacent surfaces must differ by luminance or inset material edge.

## 7. Do and Do Not

Do:

- Make Nini and Yuan visibly belong to the same culture and material world.
- Preserve equal visual importance for the protagonist pair.
- Use adult proportions, modest layered clothing, and readable artifacts.
- Concentrate detail where player attention or state change justifies it.
- Preserve keyboard focus, reduced motion, contrast preferences, and safe areas.

Do not:

- Restore magical-girl, generic xianxia, action-RPG, or independent chibi styling.
- Use exposed midriff, short idol skirt, heavy armor, or excessive jewelry.
- Use gradient-clipped text, glassmorphism, full-surface neon bloom, or `transition: all`.
- Shrink the high-detail menu illustration into the gameplay sprite.
- Add decorative motion that competes with gameplay readability.

## 8. Responsive Behavior

- `>= 980px`: two-column menu with full paired composition and horizontal action rail.
- `680px to 979px`: compact two-column or stacked menu according to available height.
- `< 680px` portrait: paired art becomes a deliberate upper crop, title and actions follow, all menu surfaces remain scrollable inside safe areas.
- Mobile character, chapter, and settings screens hide the decorative footer so it never overlays scrollable content; chapter-world headings use content-sized rows rather than inheriting chapter-card height.
- Mobile landscape: compact menu and full gameplay HUD; touch targets remain at least 48px with non-overlapping hit regions.
- Mobile portrait gameplay: show a crafted rotate-device prompt rather than compressing the level camera.

## 9. Agent Prompt Guide

Quick palette: lacquer `#0b1016`, raised lacquer `#111821`, indigo silk `#18212d`, raised silk `#202c3a`, moon white `#eee7d5`, aged gold `#c3a468`, carved jade `#6da895`, dusty rose `#b87b86`.

- Hero prompt: “Build a 5/7 desktop split on lacquer `#0b1016`; title at 72px LXGW WenKai 700 in moon white, action controls at 17px with 6px radius and aged-gold trace, paired art fills the right seven columns without generic cards.”
- Control prompt: “Create a 52px-high indigo-silk control with 6px radius, 16px LXGW WenKai 700, moon-white text, one inset `rgba(195,164,104,.20)` line, active `scale(.97)`, and a transform/opacity-only gilt trace.”
- HUD prompt: “Create a corner-instrument HUD on transparent gameplay space; 40px minimum targets, lacquer `rgba(11,16,22,.88)`, 13px tabular figures, aged-gold structure, rose health, jade skill-ready, no continuous top bar.”
- Mobile prompt: “At 844x390 landscape, preserve safe-area insets, keep gameplay center unobstructed, use a left star-dial control and three right seals with visible size 64 to 82px and larger non-overlapping hit areas.”
