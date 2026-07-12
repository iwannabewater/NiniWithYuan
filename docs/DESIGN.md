# Design System

## 1. Visual Theme and Atmosphere

The canonical direction is **宋式星图器物幻想**: a quiet night observatory expressed through Song-informed garment construction, astronomical charts, black-indigo lacquer, deep indigo silk, carved jade, aged gilt incision, and shallow relief. The interface should feel made, handled, and inherited rather than rendered from generic fantasy UI parts.

The first screen follows **双璧入卷**. Nini and Yuan appear together as equal leads inside one authored composition; the Xuanji Star Dial supplies the circular axis and the Jade Gui Sword supplies the vertical axis. On desktop, brand, actions, and journey context occupy roughly 40 percent of the frame while the paired hero art occupies 60 percent. Ornament is concentrated at the hero frame, signature artifacts, brand seal, and decisive states. Ordinary controls remain quiet.

Three implementation theses govern the work:

- **Visual thesis**: 夜观天象, museum-lit lacquer and silk with restrained rose and jade inlay.
- **Content thesis**: orient through the paired protagonists, expose the current journey state, then provide one clear action rail.
- **Interaction thesis**: **刻金显纹** traces an aged-gold edge on focus or confirmation, then settles a rose or jade inlay; motion never turns an entire surface into glow. Quiet Observatory (v1.9.0) further limits structural motion to ease-out transforms and opacity so the field stays calm while controls remain tactile.

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

The menu uses one paired composition. Character selection derives two deliberate crops from the same approved direction until production individual portraits are available. Desktop cards are horizontal artifact sheets, with a tall portrait rail beside the name, route description, ability list, and selection action. Narrow portrait layouts turn the sheets into a swipeable row and keep the selected state visible. Nini keeps purple hair, rose identity, and the Xuanji Star Dial; Yuan keeps deep-blue hair, jade-cyan identity, and the Jade Gui Sword. Both read as fictional adults aged 20 to 24.

### Journey and chapter selection

The menu journey strip names the current chapter and shows unlocked progress, selected companion, and collected star dew. Its route line exposes progressbar semantics and the current unlocked count. Chapter selection places each named world beside a five-chapter track. The current chapter receives a distinct material edge and `aria-current="step"`; locked chapters state that the previous chapter must be completed.

### Settings

Settings are grouped into Audio, Display, Touch, and Local Data fieldsets. Range controls show live values for sound effects, music, HUD scale, touch size, and touch opacity. Display toggles control high-frame-rate effects and camera shake. The layout uses two columns on wide screens, three compact groups in coarse-pointer landscape, and one column in portrait.

### Application icon

Web/PWA and Android launchers use the same close paired portrait of Nini and Yuan. Both adult faces remain recognizable and inside circular, rounded-square, and Android adaptive safe zones; neither protagonist may be replaced by a standalone artifact emblem. The Xuanji Union Seal remains available as an in-product symbolic mark, not as the launcher identity.

### HUD

Gameplay follows **四角仪轨**. Character, health, and status share a grouped instrument at the upper left. Star dew, ammunition, time, skill, and pause share a second instrument at the upper right. Each reading exposes a concise accessible group label, and updates only when its value changes. The chapter progress line stays narrow along the top meridian. Responsive layouts remove secondary readings before skill, pause, health, resources, or the World 3 phase status.

### Touch controls

Mobile uses **星盘双区**. Direction lives in a low-contrast left rail that lets one finger slide between left and right. Jump, skill, and shoot use three differentiated jade or lacquer seals on the right. Keyboard, pointer, touch, and assistive activation share the same action state, so aliases can overlap without releasing one another. When opposite directions overlap, the latest active source wins and the earlier held direction resumes after release. The saved size preference spans 64 to 84 CSS pixels, and opacity spans 45 to 100 percent. Compact landscape viewports cap control size while preserving 64px action targets and a clear play band.

### Orientation and modal surfaces

Coarse-pointer portrait gameplay opens an orientation dialog and freezes the simulation. The dialog offers two explicit actions: continue in portrait or return to the menu. Rotating to landscape closes the gate and restores gameplay focus. Pause, completion, failure, orientation, and easter-egg dialogs keep focus inside the active surface, mark other surfaces inert, clear transient gameplay input, and restore focus to the correct destination.

### Canvas playfield

The playfield uses the same material hierarchy as the DOM instead of a separate candy-fantasy palette:

- Level colors tint the upper atmosphere, then a lacquer veil restrains saturation.
- Parallax scenery is drawn as continuous ink-scroll bands with sparse aged-gold chart lines, not repeated triangle mountains or bright cloud ovals.
- Platforms use indigo, carved-jade, stone, or muted artifact bodies with a thin gilt top incision and shallow engraved ticks.
- Coins and gems read as small star seals; power-ups keep distinct silhouettes with restrained local glow.
- Character atlases receive a low aged-gold rim and a grounded contact shadow. In 844 by 390 landscape, a normal player stays at or below 34 percent of the playfield height while enemies render at roughly 11 percent or more without changing collision boxes.
- Character poses and atlas frames use simulation time. The renderer interpolates player and camera samples between 120 Hz updates, then synchronizes those samples after portals, respawns, lifecycle resets, and hit-stop recovery.
- Hazards retain the strongest warm-danger contrast. Goals and portals use gold, jade, rose, and phase blue as semantic rings rather than a rainbow bloom.

## 5. Layout Principles

The spacing scale is `4, 8, 12, 16, 24, 32, 48, 64`, also exposed as `--s-1` through `--s-8`. Quiet Observatory surfaces prefer the lower end of ornament weight: one aged-gold structure edge, lacquer and silk planes, and no multi-color aurora wash competing with hierarchy. Main panels use a 12-column mental grid without shipping grid utilities. Desktop menu allocation is approximately 40 percent for title, actions, and journey state, and 60 percent for the paired art. Secondary screens favor vertical inscriptions and content-specific layouts rather than interchangeable cards.

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

- `> 900px`: two-column menu with the full paired composition, a 40/60 content split, and a primary action above three secondary actions.
- `<= 900px` with a fine pointer: stacked menu, hidden touch controls, and horizontally scrollable chapter tracks where needed.
- Coarse-pointer landscape: compact two-column menu, height-bound character sheets, one world track per horizontal snap page, and 64px minimum action controls.
- `<= 680px` portrait: paired art becomes a deliberate upper crop, title and actions follow, character sheets and chapter tracks scroll horizontally, settings stack, and all menu surfaces remain usable inside safe areas.
- Mobile character, chapter, and settings screens hide the decorative footer so it never overlays scrollable content; coarse-pointer landscape covers at 340px height or less hide it as well. Chapter-world headings use content-sized rows rather than inheriting chapter-card height.
- Mobile landscape: compact menu and full gameplay HUD; touch targets remain at least 48px with non-overlapping hit regions.
- Mobile landscape World 3: the compact `phase-critical` status chip remains visible even when ordinary status pills are hidden.
- Mobile portrait gameplay: freeze behind a crafted orientation dialog, then let the player continue in portrait or return to the menu. Both actions remain at least 48px high.
- Keyboard navigation: screen entry focuses the visible heading with the aged-gold focus treatment, returning restores focus to the originating menu action, gameplay focuses the canvas, and dialog entry focuses its first action while Tab remains contained inside the active surface.
- Modal isolation: inactive application surfaces become inert until the active dialog closes. Every modal, visibility, focus, and orientation transition clears held actions and pressed edges together.

## 9. Agent Prompt Guide

Quick palette: lacquer `#0b1016`, raised lacquer `#111821`, indigo silk `#18212d`, raised silk `#202c3a`, moon white `#eee7d5`, aged gold `#c3a468`, carved jade `#6da895`, dusty rose `#b87b86`.

- Hero prompt: “Build a 40/60 desktop split on lacquer `#0b1016`; title at 72px LXGW WenKai 700 in moon white, action controls at 17px with 6px radius and aged-gold trace, and paired art filling the larger right side without generic cards.”
- Control prompt: “Create a 52px-high indigo-silk control with 6px radius, 16px LXGW WenKai 700, moon-white text, one inset `rgba(195,164,104,.20)` line, active `scale(.97)`, and a transform/opacity-only gilt trace.”
- HUD prompt: “Create a corner-instrument HUD on transparent gameplay space; 40px minimum targets, lacquer `rgba(11,16,22,.88)`, 13px tabular figures, aged-gold structure, rose health, jade skill-ready, no continuous top bar.”
- Mobile prompt: “At 844x390 landscape, preserve safe-area insets, keep gameplay center unobstructed, use a sliding left direction rail and three right seals at 64 to 84px, and keep the World 3 phase clock visible.”
