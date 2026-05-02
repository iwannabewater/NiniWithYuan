# Motion Guide

## Principles

Motion confirms input, clarifies hierarchy, and supports the night-atlas visual identity. Decorative motion must not impair control response or produce measurable frame loss on low-end Android WebView devices.

## Timing and Easing

| Token | Value | Use |
| --- | --- | --- |
| `--d-fast` | 140 ms | Button press and hover |
| `--d-base` | 220 ms | HUD chips, chapter cards, and toast |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entry, lift, and pop |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Exit |

`transition: all` is not used. Animations are limited to `transform` and `opacity`.

## Current Motion Inventory

| Element | Trigger | Behavior |
| --- | --- | --- |
| Screen | `.screen.active` | Opacity enters from 0 to 1; vertical offset moves from 10 px to 0. |
| Button | `:active` | Applies `translateY(2px) scale(0.97)`. |
| Character card | Hover, focus, or selected state | Restores saturation and opacity with a small lift. |
| Chapter intro | Gameplay start | Enters through opacity and transform. |
| Toast | Message display | Uses opacity and vertical displacement. |
| Modal | Open | Shows a backdrop and a small floating card motion. |
| Canvas particles | Pickup, jump, and skill events | Emits particles when visual effects are enabled. |
| Touch buttons | Jump, skill, or shoot press | Requests an 8 ms vibration on supported devices. |

## Reduced Motion

Under `prefers-reduced-motion: reduce`, CSS transitions and animations use a near-zero duration. Canvas particles remain available because they also communicate gameplay events; players can reduce them through the visual effects setting.

## BGM and Audio

Audio is managed by `src/core/audio.js` through `AudioBus`.

- Master volume uses `settings.volume`.
- Background music uses `settings.bgmVolume`.
- SFX uses Web Audio triangle beeps.
- BGM uses a local looped OGG Vorbis file.
- BGM starts after entering gameplay and pauses in menus, modals, completion states, and failure states.
- `visibilitychange` and `pagehide` suspend the AudioContext and pause BGM; foreground return resumes only when gameplay remains active.

The current BGM is `Fairy Adventure` by MintoDog, licensed CC0 1.0 Universal. Source and license data are recorded in [assets/audio/NOTICE.md](../assets/audio/NOTICE.md).
