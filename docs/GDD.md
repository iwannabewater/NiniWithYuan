# Game Design Document

## Product Definition

`Nini & Yuan` is a Chinese-language fantasy platformer built for the web and Android WebView. The core design value is route differentiation between two characters: Nini favors elevated collection routes, double jumps, and gliding; Yuan favors dash movement, crystal breaking, and fast clears through danger zones.

Version 1.1.0 keeps the chapter set fixed at five. The release concentrates on security hardening, technical foundation, visual identity, landscape mobile play, background music, and release readiness.

## Fiction

The setting is a floating night city above a sea of starlight. The heart stone of the celestial atlas has broken into five fragments, each lost in a different domain. Nini and Yuan follow the atlas to recover the fragments and reconnect the broken routes.

Playable characters:

- Nini is a starlight traveler. Her mechanics emphasize double jumps, gliding, and precise landings.
- Yuan is a gale-blade traveler. Her mechanics emphasize dashing, crystal breaking, and direct traversal through high-risk spaces.

## Core Mechanics

### Physics

- Fixed step: `FIXED_DT = 1 / 120`.
- Approximate jump heights: Nini 240 px; Yuan 209 px.
- Coyote time: 0.12 s.
- Jump buffer: 0.14 s.
- The main loop clamps accumulated time after background or foreground transitions.

### Skills

| Character | Skill | Design Function |
| --- | --- | --- |
| Nini | Starlight Glide | Slows descent, corrects landing position, and supports elevated routes. |
| Yuan | Gale Dash | Provides fast horizontal movement, breaks crystals, and defeats enemies on contact. |

### Projectiles

| Character | Projectile | Properties |
| --- | --- | --- |
| Nini | Starlight Shot | Fast projectile with mild homing and lower damage. |
| Yuan | Gale Shot | Slower projectile with one pierce and higher damage. |

The ammunition cap is 14. The default regeneration rate is one unit per 1.6 s. During the core power-up, projectile speed, damage, and pierce increase.

### Power-Ups

| Item | Effect |
| --- | --- |
| Star Berry | Enlarges the character for 20 s and raises maximum health. |
| Moon Sugar | Grants invulnerability for 8 s. |
| Crystal Core | Enhances projectiles for 12 s. |
| Wind Bell Fruit | Refreshes skill cooldown and shortens cooldowns for 15 s. |
| Health Pack | Restores 1 health. |

## Chapters

| Chapter | English Name | Theme | Design Focus |
| --- | --- | --- | --- |
| 1 | Starlight Garden | Twilight garden | Onboarding, double jumps, and enemy stomps. |
| 2 | Moon-Mirror Ruins | Reflective ruins | Moving platforms and elevated collection routes. |
| 3 | Cloudsea Sails | High-altitude wind fields | Wind zones that modify landing positions. |
| 4 | Radiant Forge | Crystal furnace | Breakable crystals and denser hazards. |
| 5 | Aurora Citadel | Aurora throne | Combined wind, moving platform, crystal, and jump-chain tests. |

Star ratings are determined by collection ratio:

- three stars above 82%;
- two stars above 52%;
- one star otherwise.

## Interface Flow

```text
Main menu
  ├─ Continue -> gameplay
  ├─ Chapter select -> gameplay
  ├─ Character select -> main menu
  └─ Settings -> main menu

Gameplay
  ├─ Pause -> resume / restart / return to menu
  └─ Completion -> next chapter / replay / chapter select
```

## Save Data

Save data is stored in localStorage under `nini-yuan-save-v1`. The current schema version is 2.

Fields:

- `schemaVersion`
- `selected`
- `unlocked`
- `totalCoins`
- `bestTimes`
- `levelStars`
- `settings.volume`
- `settings.touch`
- `settings.fx`
- `settings.bgmVolume`

Loading applies schema validation, type clamping, and chapter ID allow-listing. If localStorage is unavailable or tampered with, the game falls back to safe defaults.

## Planned Scope

- v1.1.0: security, technical foundation, visual system, BGM, release documentation, and Android landscape support.
- v1.2.0: production character sprite sheets and a possible sixth chapter.
- v2.0.0: achievements, local replay, or cloud save, subject to a separate scope review.
