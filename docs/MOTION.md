# Motion Guide

## Principles

Motion confirms input, clarifies hierarchy, and supports the **Aurora Inkwash · Night Atlas Cinematic** identity. Decorative motion must not impair control response or produce measurable frame loss on low-end Android WebView devices.

Animation is limited to `transform` and `opacity` on small surfaces. Full-screen animated blur, masks, `backdrop-filter`, and `transition: all` are not used.

## Timing and Easing

| Token | Value | Use |
| --- | --- | --- |
| `--d-fast` | 140 ms | Button press, hover, immediate feedback |
| `--d-base` | 240 ms | HUD chips, chapter cards, modal veil, toast |
| `--d-slow` | 520 ms | Hero card lift, screen entry tail |
| `--d-breath` | 3.2 s | Touch action readiness pulse |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entry, lift, pop |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Exit |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Toast, modal card, hero parallax |
| `--ease-soft` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Long hover transitions |

## Signature Micro-Interactions

| # | Element | Trigger | Behavior |
| --- | --- | --- | --- |
| 1 | `.brand h1` | Menu enters | Brushwork title reveal: opacity rises and the title settles over 1.1 s. |
| 2 | `.menu-heroes::before/.menu-heroes::after` | Static | Aurora halo and star-chart tracery behind the heroes add color depth without animation or blur filters. |
| 3 | `.character-card[data-character]::after` | Hover, focus, selected | Character-tinted halo (rose for Nini, jade for Yuan) fades in and lights a gold ring. |
| 4 | `.level-item.featured::before` | Static | Atlas ring marks the next available chapter with a hairline arc and star core. |
| 5 | `.touch-btn.jump/.skill/.shoot::before` | Idle | Breath aura ring scales 0.96 -> 1.04 over 3.2 s; cancels instantly on press. |
| 6 | `.ambient-rune` / `.ambient-spark` / `.ambient-constellation` | Menu surfaces only | Calligraphic rune drift, sparkle twinkle, and connected six-star glyph pulse fill the empty viewport zones outside the panel and pause during gameplay. |
| 7 | `.cursor-spark` | Pointer move on cover or title (`(hover: hover) and (pointer: fine)`) | Distance-interpolated gold/rose/jade/cyan stardust emits into a fixed full-viewport layer above the active menu panel, fills fast pointer movement at roughly 18 px intervals, lifts 30-54 px, and fades over 960 ms; capped at 56 active sparks; disabled under reduced-motion. |
| 8 | `.love-letter` / `.love-heart` / `.love-toast` | Hidden Yuan-to-Nini surprises | A discovered easter egg fades a centered letter card, a beating constellation heart, or a top-center toast in for a few seconds, then fades back out. The heart beats at 1.6 s and pauses under reduced-motion. |
| 9 | `.level-item.featured::before` | Static featured chapter | `compass-rotate` slowly turns the gold conic ring at 18 s per revolution; the four-point `✦` core stays static for legibility. Paused under reduced-motion. |
| 10 | `.level-list::after` | Hover (fine pointer) | Hairline meridian rail fades from 0 to 0.42 opacity over `--d-slow`, connecting the four ordinary chapters and the featured chapter into one inked map. |
| 11 | `.brand::after` | Menu enters | `aurora-sweep` paints a gold/rose/jade/cyan brushwork under the wordmark at 1.4 s ease-out with a 220 ms delay, then settles at 60 % horizontal scale and 50 % opacity. Hidden under reduced-motion. |
| 12 | `.menu-heroes` `--mx` / `--my` | Pointer move (fine pointer) | Two-axis parallax: nini drifts up to ±6 px and yuan counter-drifts. Touch devices substitute a 7 s `hero-breath` tilt. Both pause under reduced-motion. |
| 13 | `.hud-pill.pulse` | Character / skill state actually flips | `hud-pulse` 420 ms ease-spring scales 1.0 → 1.04 → 1.0 with a gold inset-glow flash. Fired only when the cached previous value differs. Static under reduced-motion. |
| 14 | `.bossbar span` | Continuous during gameplay | `bossbar-shimmer` 7 s linear loops the auroral wash; the leading-edge gleam pseudo sits at 100 % of the fill. Paused under reduced-motion. |
| 15 | `body:has(.chapter-intro.active) .bossbar / #controlTips` | Chapter starts | `bossbar-rise` and `tips-rise` stagger the bossbar (0 ms), chapter intro card (its own 240 ms transition), and control tips (160 ms delay) into a single orchestrated entrance. Collapsed to zero under reduced-motion. |
| 16 | `.touch-btn.jump / .skill / .shoot::after` | Static decoration | Refined SVG-data-URL glyph mark rendered via `mask-image` and `currentColor`, sized at 32 % of the button. No animation; no asset cost. |
| 17 | `.modal-card::after` | Pause / completion modal open | `seal-breathe` 9 s ease-soft scales 0.96 ↔ 1.04 and 0.78 ↔ 0.92 opacity on a gold conic seal masked into a hairline ring. Paused under reduced-motion. |
| 18 | `.settings-list label[data-rune]::before` | Static decoration | Gold rune chip (♪ / ♬ / ◐ / ✦) with hairline ribbon stub. CSS-only, reads `attr(data-rune)`. |
| 19 | `.ambient-spark.lit` | Constellation-hunt click | `spark-lit` 1.4 s ease-soft scales the spark to 2.2× with a doubled glow then settles. Active only on `(hover: hover) and (pointer: fine)`. |

## Continuous Motion

| Element | Trigger | Behavior |
| --- | --- | --- |
| `.screen.active` | Screen mount | Opacity 0→1, translateY(14)→0, scale(0.992)→1 over 480 ms ease-out. |
| `button:active` | Press | `translateY(2px) scale(0.97)` over 140 ms. |
| `button:hover` | Hover | translateY(-1) + gold halo box-shadow. |
| `.character-card:hover` | Hover | translateY(-3) + halo opacity rises. |
| `.chapter-intro.active` | Gameplay start | Opacity 0→1, translateY(-10)→0, scale(0.98)→1. |
| `.toast.show` | Message | Spring slide from translateY(-12) to 0. |
| `.modal.active` | Modal open | Veil fades, card pops with spring scale + translate. |
| `.hud-pill.skill-state` | State change | Underline color flips between jade and gold. |
| `.bossbar span` | Progress change | Width interpolates over 240 ms. |

## Reduced Motion

Under `prefers-reduced-motion: reduce`:

- All transition and animation durations collapse to ~0 ms.
- `body::after` aurora remains static with reduced opacity.
- `.menu-heroes::before` and `.level-item.featured::before` are already static.
- `.touch-btn` breath aura is hidden.
- Ambient runes, sparks, the constellation glyph, and the gold strip mark stop animating.
- Pointer stardust trail (`.cursor-trail`) is hidden so no spawn-and-fade particles run.
- Hidden easter-egg heart pauses its heartbeat scale loop.
- v1.2.4 keyframes pause: featured-chapter compass rotation, brand sub-aurora sweep, HUD pulse, bossbar shimmer, hero breath, modal seal breathe, spark-lit, and the chapter-intro orchestration `bossbar-rise` / `tips-rise`.
- Cover-hero parallax stops writing `--mx` / `--my` because the script gates on reduced-motion at attach time, so the heroes return to their static rotated transforms.
- Canvas particles remain available because they communicate gameplay events; players can reduce them through the visual effects setting.

## BGM and Audio

Audio is managed by `src/core/audio.js` through `AudioBus`.

- Master volume uses `settings.volume`.
- Background music uses `settings.bgmVolume`.
- SFX uses Web Audio triangle beeps.
- BGM uses a local looped OGG Vorbis file.
- BGM starts after entering gameplay and pauses in menus, modals, completion states, and failure states.
- `visibilitychange` and `pagehide` suspend the AudioContext and pause BGM; foreground return resumes only when gameplay remains active.

The current BGM is `Fairy Adventure` by MintoDog, licensed CC0 1.0 Universal. Source and license data are recorded in [assets/audio/NOTICE.md](../assets/audio/NOTICE.md).
