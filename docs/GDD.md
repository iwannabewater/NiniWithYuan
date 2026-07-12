# Game Design Document

## Product Definition

`Nini & Yuan` is a Chinese-language fantasy platformer built for the web and Android WebView. Route choice distinguishes the two characters: Nini favors elevated collection routes, double jumps, and gliding; Yuan favors dash movement, crystal breaking, and fast clears through danger zones.

v1.9.0 keeps the fifteen-chapter structure and core physics while refining **宋式星图器物幻想 / Song-atlas Night Observatory** into a quieter instrument: calmer ornament, clearer control feedback, and presentation pose blending without changing routes or abilities. The original five chapters form World 1, **第一星域 破碎星图**. World 2, **第二星域 星门群岛**, contains five paired-star-gate chapters. World 3, **第三星域 星潮镜域**, contains five handcrafted chapters built around phase-tide bridges, route timing, and readable two-phase traversal without a hard postgame difficulty spike.

## Fiction

The setting is a floating night observatory above a sea of starlight. The heart stone of the celestial atlas has broken into five fragments, each lost in a different domain. Nini and Yuan follow the atlas to recover the fragments and reconnect the broken routes. After Aurora Citadel is restored, dormant star gates wake across nearby islands and fold the atlas into a second playable world. Once the island star core is rejoined, the atlas opens a mirror-water domain where star tides alternate which routes are physically present.

Playable characters:

- Nini is the Xuanji Star Dial bearer. Her mechanics emphasize double jumps, gliding, and precise landings.
- Yuan is the Jade Gui Sword bearer. His mechanics emphasize dashing, crystal breaking, and direct traversal through high-risk spaces.

## Core Mechanics

### Physics

- Fixed step: `FIXED_DT = 1 / 120`.
- Frame scheduling clamps lifecycle gaps to 80 ms and executes at most eight fixed steps per rendered frame. Normal 60, 30, 25, and 20 fps delivery preserves real simulation time; overload drops only whole steps beyond the guard.
- Approximate jump heights: Nini 240 px; Yuan 209 px.
- Coyote time: 0.12 s.
- Jump buffer: 0.14 s.
- Every chapter begins with the player bottom-aligned to the authored opening platform, grounded, and eligible for a buffered first jump on the next fixed step.
- The main loop clears accumulated time and all transient input after background or foreground transitions.
- Rendering interpolates the previous and current fixed-step samples for the player and camera, then quantizes the result to the device-pixel grid. Portals, respawns, lifecycle resets, and hit-stop recovery synchronize those samples so presentation never rewinds across a discontinuity.
- Character poses and atlas frames use simulation time. Animation state belongs to the presentation layer and does not alter player entities, collision, or fixed-step rules.
- Presentation-only hit-stop, camera lookahead, landing dust, shake clamping, and respawn veil polish do not change jump height, gravity, dash distance, coyote time, jump buffer, or level solvability.

### Wind Fields

Wind fields appear in chapter 3 and chapter 5. They are directional horizontal currents that contribute to the player's movement target, so they visibly change landing positions, partially counter movement into the wind without blocking forward progress on the ground or during jumps, and speed same-direction routes without exceeding the wind speed cap. Canvas wind fields draw repeated arrowheads that drift with the current direction to make the airflow readable during play.

### Enemies

Slimes and embers are ground enemies across all chapters. They spawn bottom-aligned to the platform row they are placed on, draw contact feet/shadow, use their current supporting platform as the patrol boundary, and show a quiet ground intent rail so the player can read their path before contact. Wisps are flying enemies: they spawn above the platform row with a visible hover gap, use bounded hover around their base route, and draw a winged aurora-core silhouette with a distant shadow, no feet, and a dashed hover tether. Projectile hits add a short ivory flash on the enemy body without changing enemy health, patrol, or collision rules.

### Skills

| Character | Skill | Design Function |
| --- | --- | --- |
| Nini | 璇玑星渡 | Slows descent, corrects landing position, and supports elevated routes. |
| Yuan | 青衡破风 | Provides fast horizontal movement, breaks crystals, and defeats enemies on contact. |

An eligible Nini skill press preserves 120 ms of glide intent. A short tap during takeoff or airborne play therefore starts a readable glide instead of disappearing between fixed steps. The skill cooldown begins only when the glide starts.

### Projectiles

| Character | Projectile | Properties |
| --- | --- | --- |
| Nini | 星露弹 | Fast projectile with mild homing and lower damage. |
| Yuan | 青岚弹 | Slower projectile with one pierce and higher damage. |

The regenerating ammunition cap is 14. Power-up pickups may create a temporary reserve up to 24; passive regeneration never fills above 14. The default regeneration rate is one unit per 1.6 s. During the core power-up, projectile speed, damage, and pierce increase.

### Input and Outcome Integrity

- Gameplay keys are captured only while `mode === "play"` and the event target is not a button, range, editable field, or contenteditable surface. Native menu activation and settings arrow-key behavior always win outside that boundary.
- Keyboard keys, touch or pointer contacts, and assistive click activations share one per-action source registry. Each source owns one action, and an action remains active until its final source releases.
- When left and right are both active, the most recently pressed active source sets the direction. Releasing that source restores an older direction that is still held. Sliding a finger across the left touch rail transfers the same source between left and right.
- Menu, modal, blur, page visibility, restart, and return-to-menu transitions clear gameplay held keys, pressed or released edges, and active action sources together. Any mapped physical key already down is suppressed across the boundary until its matching release, so browser repeat cannot create a new action after focus handoff.
- Failure and completion are mutually exclusive terminal outcomes. If lethal contact and the goal overlap in one fixed step, failure takes precedence.
- Moon Sugar blocks repeated damage continuously, but its shield sound, burst, and camera feedback are rate-limited to one event per 180 ms.

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

World 3 introduces phase-tide bridges. A level-local tide clock alternates between phase `a` and phase `b`. Phase-tagged platforms, moving platforms, hazards, coins, and gems participate only when their phase is active. Inactive phase objects render as ghosted mirror silhouettes so the player can read the next route before committing, and the HUD reports the active phase with a one-decimal remaining-time countdown. The mechanic does not change fixed-step physics, character jump/dash/glide tuning, or input handling.

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

Star ratings are determined only by the value of level coins and gems collected. Combat rewards still contribute to earned star dew and persistent totals, but never raise the collection rating:

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
  ├─ Portrait guidance -> continue in portrait / return to menu
  └─ Completion -> next chapter / replay / chapter select
```

The desktop menu gives roughly 40 percent of its width to the brand, actions, and journey summary, with the paired hero composition occupying the remaining 60 percent. The primary action follows the current save, while the journey strip reports the current chapter, unlocked progress, selected companion, and collected star dew. Narrow fine-pointer screens stack the composition; coarse-pointer landscape uses a shorter two-column arrangement; portrait keeps the menu scrollable and crops the hero art deliberately.

Character selection uses horizontal artifact sheets with portrait, ability copy, and an explicit selected state. On narrow portrait screens, the sheets become a swipeable row. Chapter selection groups five chapters into each named world track, marks the current step, and states why locked chapters are unavailable. Settings use separate Audio, Display, Touch, and Local Data groups with live values for every range.

The HUD separates character, health, and status on the left from resources, time, skill, and pause on the right. A narrow route line shows chapter progress. Responsive rules remove secondary readings before essential controls, while the World 3 phase status remains visible. Touch play uses a sliding direction rail on the left and separate jump, skill, and projectile seals on the right; saved size and opacity settings apply without reducing the minimum touch target.

On a coarse-pointer portrait viewport, gameplay pauses behind an orientation dialog. The player may continue in portrait or return to the menu, and rotating the device resumes the normal layout. Pause, outcome, orientation, and easter-egg dialogs isolate the inactive surfaces, contain keyboard focus, clear gameplay input, and freeze simulation where required.

## Save Data

Save data is stored in localStorage under `nini-yuan-save-v1`. The current schema version is 3.

Fields:

- `schemaVersion`
- `selected`
- `unlocked`
- `totalCoins`
- `bestTimes`
- `levelStars`
- `settings.volume`
- `settings.touch`
- `settings.touchOpacity`
- `settings.hudScale`
- `settings.shake`
- `settings.fx`
- `settings.bgmVolume`

| Setting | Default | Accepted values |
| --- | --- | --- |
| Master volume | 70 | 0 to 100 |
| BGM volume | 60 | 0 to 100 |
| Touch size | 76 px | 64 to 84 px |
| Touch opacity | 68% | 45 to 100% |
| HUD scale | 100% | 90 to 140% |
| Camera shake | On | On or off |
| High-frame-rate effects | On | On or off |

Loading applies schema validation, type clamping, and chapter ID allow-listing. Schema 3 adds touch opacity, HUD scale, and camera shake preferences while retaining the existing storage key. Older saves receive safe defaults for the new fields and clamp to the fifteen-chapter cap. Completed Aurora Citadel progress derives chapter 6 access, and completed Ring Conservatory progress derives chapter 9 access. If localStorage is unavailable or tampered with, the game falls back to safe defaults.

## Planned Scope

- v1.1.0: security, technical foundation, visual system, BGM, release documentation, and Android landscape support.
- v1.2.0: Aurora Inkwash visual refresh, lighter menu rendering, PWA/Android palette sync, and release documentation.
- v1.2.1: focused gameplay fixes for chapter 3/5 wind fields, grounded enemy patrols, and flying wisp readability, plus regression coverage.
- v1.2.2: cover copy, chapter-card alignment, and static menu star-chart polish.
- v1.3.0: World 2 content expansion with three star-gate chapters, world-grouped chapter select, and save-compatible eight-chapter release metadata.
- v1.3.1: typography and copy bugfix pass for local WenKai glyph coverage, shared DOM/Canvas font usage, count-free current scope copy, and Chinese easter-egg overlays.
- v1.4.0: World 2 completion with two additional star-gate chapters, World 3 phase-tide expansion with five chapters, and save-compatible fifteen-chapter release metadata.
- v1.5.0: game-feel and sound-design polish with hit-stop, dash anticipation, landing dust, shake clamp, BGM retry, respawn veil, camera lookahead, and semantic audio cues.
- v1.5.1: mobile touch-control action labels and glyph marks are centered inside their circular buttons in portrait and Android landscape.
- v1.6.0: Song-atlas cover art, production character atlases, motion-resolved poses, the Xuanji Union Seal icon, instrument HUD, and portrait orientation guidance form one visual system without changing physics or save compatibility.
- v1.6.1: responsive reversal and camera intent, distance-synchronized gait, front-facing idle poses, stable touch capture, canonical path normalization, compact mobile chapter browsing, and reliable cross-orientation release capture.
- v1.6.2: directional complete-silhouette idle poses and paired-protagonist Web/PWA plus Android launcher identity, with unchanged physics and save compatibility.
- v1.6.3: Nini's complete idle source frame is marked as left-facing so default and rightward idle read forward-right, while last-direction idle behavior remains unchanged.
- v1.7.0: phase-tide countdown readability, enemy patrol/hover intent marks, projectile-hit flash feedback, and stable accessibility navigation checks ship without changing physics, chapters, save schema, abilities, or input bindings.
- v1.8.0: unified multi-source input, 120 ms glide intent, simulation-time character motion, fixed-step presentation interpolation, responsive journey and selection layouts, grouped HUD instruments, adjustable touch and display settings, and a choice-based portrait orientation dialog. Chapters, abilities, and base movement tuning remain unchanged; the save schema advances to 3 for the new preferences.
- v1.9.0: Quiet Observatory polish with presentation pose blending, pure input edge helpers, quieter ambient and brand ornament, calmer structural motion, and clearer touch press seals. Physics, chapters, and save schema remain unchanged.
- Future release: expanded enemy variants or optional challenge routes, subject to a separate scope review.
- v2.0.0: achievements, local replay, or cloud save, subject to a separate scope review.
