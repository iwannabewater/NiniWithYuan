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
| 2 | `.menu-heroes::before` | Static | Aurora halo behind the heroes adds color depth without animation or blur filters. |
| 3 | `.character-card[data-character]::after` | Hover, focus, selected | Character-tinted halo (rose for Nini, jade for Yuan) fades in and lights a gold ring. |
| 4 | `.level-item.featured::before` | Static | Atlas ring marks the next available chapter with a hairline arc and star core. |
| 5 | `.touch-btn.jump/.skill/.shoot::before` | Idle | Breath aura ring scales 0.96 -> 1.04 over 3.2 s; cancels instantly on press. |

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
