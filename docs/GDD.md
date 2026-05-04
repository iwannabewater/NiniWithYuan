# Game Design Document

## Product Definition

`Nini & Yuan` is a Chinese-language fantasy platformer built for the web and Android WebView. The core design value is route differentiation between two characters: Nini favors elevated collection routes, double jumps, and gliding; Yuan favors dash movement, crystal breaking, and fast clears through danger zones.

Version 1.5.0 keeps the fifteen-chapter v1.4.0 structure and adds a focused game-feel and sound-design polish pass while preserving the v1.2.x physics, controls, visual shell, offline storage model, and content layout. The original five chapters are grouped as World 1, **第一星域 破碎星图**. World 2, **第二星域 星门群岛**, contains five paired-star-gate chapters. World 3, **第三星域 星潮镜域**, contains five handcrafted chapters built around phase-tide bridges, route timing, and readable two-phase traversal rather than a hard postgame difficulty spike.

## Fiction

The setting is a floating night city above a sea of starlight. The heart stone of the celestial atlas has broken into five fragments, each lost in a different domain. Nini and Yuan follow the atlas to recover the fragments and reconnect the broken routes. After Aurora Citadel is restored, dormant star gates wake across nearby islands and fold the atlas into a second playable world. Once the island star core is rejoined, the atlas opens a mirror-water domain where star tides alternate which routes are physically present.

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
- v1.5.0 adds presentation-only hit-stop, camera lookahead, landing dust, shake clamping, and respawn veil polish. These do not change jump height, gravity, dash distance, coyote time, jump buffer, or level solvability.

### Wind Fields

Wind fields appear in chapter 3 and chapter 5. They are directional horizontal currents that contribute to the player's movement target, so they visibly change landing positions, partially counter movement into the wind without blocking forward progress on the ground or during jumps, and speed same-direction routes without exceeding the wind speed cap. Canvas wind fields draw repeated arrowheads that drift with the current direction to make the airflow readable during play.

### Enemies

Slimes and embers are ground enemies across all chapters. They spawn bottom-aligned to the platform row they are placed on, draw contact feet/shadow, and use their current supporting platform as the patrol boundary, turning around at platform-safe limits. Wisps are flying enemies: they spawn above the platform row with a visible hover gap, use bounded hover around their base route, and draw a winged aurora-core silhouette with a distant shadow and no feet.

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

### Star Gates

World 2 introduces paired star gates. A gate activates only when the player's body overlaps its field and its pair is available, then teleports the player to the paired gate's safe exit point. The transition preserves velocity, facing, health, skill state, projectile ammo, and collection progress; it applies a short cooldown plus an exit-gate lock so the player cannot bounce back and forth while standing inside the target field. Portal exits are authored and tested against platform solids and level bounds.

### Phase-Tide Bridges

World 3 introduces phase-tide bridges. A level-local tide clock alternates between phase `a` and phase `b`. Phase-tagged platforms, moving platforms, hazards, coins, and gems participate only when their phase is active. Inactive phase objects render as ghosted mirror silhouettes so the player can read the next route before committing. The mechanic does not change fixed-step physics, character jump/dash/glide tuning, or input handling.

## Chapters

| Chapter | English Name | Theme | Design Focus |
| --- | --- | --- | --- |
| 1 | Starlight Garden | Twilight garden | Onboarding, double jumps, and enemy stomps. |
| 2 | Moon-Mirror Ruins | Reflective ruins | Moving platforms and elevated collection routes. |
| 3 | Cloudsea Sails | High-altitude wind fields | Wind zones that modify landing positions. |
| 4 | Radiant Forge | Crystal furnace | Breakable crystals and denser hazards. |
| 5 | Aurora Citadel | Aurora throne | Combined wind, moving platform, crystal, and jump-chain tests. |
| 6 | Star Gate Cove | Tide-lit gate islands | First paired-gate route split with low punishment. |
| 7 | Looping Lighthouse | Vertical beacon tower | Layered gate loops, glides, dashes, and collection routing. |
| 8 | Ring Conservatory | Floating greenhouse rings | Mid-World 2 route combining gates, wind, moving platforms, and crystals. |
| 9 | Star Bridge Tide | Tide-lit star bridge | Star gates plus wind fields and momentum preservation. |
| 10 | Island Star Core | Star-core archipelago | World 2 finale combining gates, wind, moving platforms, crystals, and a longer collection route. |
| 11 | Phase Shallows | Mirror-water shallows | Phase-tide tutorial with low-risk bridge timing. |
| 12 | Tide Corridor | Alternating star corridor | Phase pickups and route timing. |
| 13 | Moon-Mirror Break | Broken mirror bridge | Phase bridges plus wind-field landing prediction. |
| 14 | Twin-Star Clocktower | Star gate clocktower | Hybrid phase bridges plus star gates. |
| 15 | Phase Tide Court | Mirror-tide court | Final synthesis of phase bridges, portals, wind, moving platforms, crystals, and hazards. |

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

Loading applies schema validation, type clamping, and chapter ID allow-listing. The schema version remains 2 in v1.5.0; existing saves clamp to the fifteen-chapter cap. Completed Aurora Citadel progress derives chapter 6 access, and completed Ring Conservatory progress derives chapter 9 access. If localStorage is unavailable or tampered with, the game falls back to safe defaults.

## Planned Scope

- v1.1.0: security, technical foundation, visual system, BGM, release documentation, and Android landscape support.
- v1.2.0: Aurora Inkwash visual refresh, lighter menu rendering, PWA/Android palette sync, and release documentation.
- v1.2.1: focused gameplay fixes for chapter 3/5 wind fields, grounded enemy patrols, and flying wisp readability, plus regression coverage.
- v1.2.2: cover copy, chapter-card alignment, and static menu star-chart polish.
- v1.3.0: World 2 content expansion with three star-gate chapters, world-grouped chapter select, and save-compatible eight-chapter release metadata.
- v1.3.1: typography and copy bugfix pass for local WenKai glyph coverage, shared DOM/Canvas font usage, count-free current scope copy, and Chinese easter-egg overlays.
- v1.4.0: World 2 completion with two additional star-gate chapters, World 3 phase-tide expansion with five chapters, and save-compatible fifteen-chapter release metadata.
- v1.5.0: game-feel and sound-design polish with hit-stop, dash anticipation, landing dust, shake clamp, BGM retry, respawn veil, camera lookahead, and semantic audio cues.
- Future release: production character sprite sheets, expanded enemy variants, or optional challenge routes, subject to a separate scope review.
- v2.0.0: achievements, local replay, or cloud save, subject to a separate scope review.
