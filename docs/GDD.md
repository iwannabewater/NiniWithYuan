# Game Design Document

## Product Definition

`Nini & Yuan` is a Chinese-language fantasy platformer built for the web and Android WebView. Route choice distinguishes the two characters: Nini favors elevated collection routes, double jumps, and gliding; Yuan favors dash movement, crystal breaking, and fast clears through danger zones.

v2.0.0 keeps the fifteen-chapter structure and core physics under **宋式星图器物幻想 / Song-atlas Night Observatory**. The release adds a meta-progression layer, three world-finale guardians, mid-chapter checkpoints, chain scoring, and an assist mode without changing routes, abilities, or movement tuning. The original five chapters form World 1, **第一星域 破碎星图**. World 2, **第二星域 星门群岛**, contains five paired-star-gate chapters. World 3, **第三星域 星潮镜域**, contains five handcrafted chapters built around phase-tide bridges, route timing, and readable two-phase traversal without a hard postgame difficulty spike.

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

Slimes and embers are ground enemies across all chapters. Two hostiles arrive in v2.0.0. 哨星 sentries are fixed emplacements: they face the player, telegraph, and fire one slow bolt, so the answer is position rather than reaction speed. 石胄 warders are shelled walkers that deflect projectiles and must be answered with a stomp, a dash, or invulnerability. They spawn bottom-aligned to the platform row they are placed on, draw contact feet/shadow, use their current supporting platform as the patrol boundary, and show a quiet ground intent rail so the player can read their path before contact. Wisps are flying enemies: they spawn above the platform row with a visible hover gap, use bounded hover around their base route, and draw a winged aurora-core silhouette with a distant shadow, no feet, and a dashed hover tether. Projectile hits add a short ivory flash on the enemy body without changing enemy health, patrol, or collision rules.

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

### Checkpoints

Every chapter derives two or three 星灯 star lanterns from its authored main
platforms, never over a hazard. Touching one lights it and moves the respawn
anchor there. Leaving the floor costs one health and returns the player to the
last lit lantern; it does not end the attempt. Chapters sealed by a warden also
place a lantern just before the arena.

### Chain Scoring

Enemy defeats, gem pickups, and warden hits extend a 2.4 second chain. Every
three links raise a star-dew multiplier, capped at five. Common star dew refreshes
a live chain without extending it. The multiplier only ever adds star dew. The
collection rating still reads the authored pickup value, so chain play never
raises a star rating.

### Wardens

Chapter 5, chapter 10, and chapter 15 each end at a 守望者 guardian. Entering the
arena wakes it, seals the arena's left edge, and locks the gate until it falls.

| Chapter | Warden | Star force | Arena |
| --- | --- | --- | --- |
| 5 Aurora Citadel | 极光守望者 | 16 | 22 tiles |
| 10 Island Star Core | 群岛守望者 | 20 | 13 tiles |
| 15 Phase Tide Court | 星潮守望者 | 24 | 24 tiles |

One data-authored encounter model serves all three. Three stages escalate as star
force drops: each widens the attack pool and shortens the cadence. Attacks are
`volley` (an aimed fan of bolts), `rain` (falling shards over telegraphed ground
marks), `sweep` (a grounded charge across the arena), and `summon` (two wisps).

Every attack opens with a 0.55 second telegraph. The guardian then descends into
player reach for its recovery beat, which is the only window where projectiles,
stomps, and dashes land, and also the only window where its body can hurt the
player at ground level. Defeating a guardian without taking damage is recorded
separately.

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

### Star Marrow

One 星髓 is hidden in every chapter, fifteen in total. Each sits off the forward
route, above the optional elevated line, and is recorded the moment it is
touched, so a later failure never takes it back. Star marrow does not affect the
collection rating.

### Trial Medals

Each chapter declares a par time. A recorded best time earns 星章 at or under
par, 月章 within 1.25x par, and 露章 within 1.6x par. Par times were calibrated
against measured route times, so a medal reflects a deliberate route rather than
a first clear.

### Assist Mode

星辉护佑 offers invulnerability, a skill with no cooldown, one bonus air jump, and
a game speed between 60 and 100 percent. Assist scales the delivered frame, never
the fixed step, so physics constants, coyote time, jump buffer, and the step
budget are unchanged. A fall under assist still returns the player to the last
lit lantern, because there is nothing to stand on below the floor.

Assisted runs unlock chapters and record star ratings and star marrow. They do
not write best times or trial medals, and any assist use in the file
disqualifies the 独行星路 record. The settings group states this before the run.

### Astral Record

星录 holds thirty achievements across six groups: 征程 journey, 守望 wardens,
收集 collection, 试炼 trials, 技巧 mastery, and 秘录 secrets. The two secret
entries stay unnamed until earned. Achievement state is evaluated as a pure
function of the sanitized save plus chapter metadata rather than incremented, so
it cannot drift from the underlying records.

## Chapters

| Chapter | English Name | Theme | Par | Design Focus |
| --- | --- | --- | --- | --- |
| 1 | Starlight Garden | Twilight garden | 20 s | Onboarding, double jumps, and enemy stomps. |
| 2 | Moon-Mirror Ruins | Reflective ruins | 24 s | Moving platforms and elevated collection routes. |
| 3 | Cloudsea Sails | High-altitude wind fields | 28 s | Wind zones that modify landing positions. |
| 4 | Radiant Forge | Crystal furnace | 30 s | Breakable crystals and denser hazards. |
| 5 | Aurora Citadel | Aurora throne | 55 s | Combined wind, moving platform, crystal, and jump-chain tests, sealed by 极光守望者. |
| 6 | Star Gate Cove | Tide-lit gate islands | 24 s | First paired-gate route split with low punishment. |
| 7 | Looping Lighthouse | Vertical beacon tower | 28 s | Layered gate loops, glides, dashes, and collection routing. |
| 8 | Ring Conservatory | Floating greenhouse rings | 32 s | Mid-World 2 route combining gates, wind, moving platforms, and crystals. |
| 9 | Star Bridge Tide | Tide-lit star bridge | 30 s | Star gates plus wind fields and momentum preservation. |
| 10 | Island Star Core | Star-core archipelago | 65 s | World 2 finale combining gates, wind, moving platforms, crystals, and a longer collection route, sealed by 群岛守望者. |
| 11 | Phase Shallows | Mirror-water shallows | 32 s | Phase-tide tutorial with low-risk bridge timing. |
| 12 | Tide Corridor | Alternating star corridor | 36 s | Phase pickups and route timing. |
| 13 | Moon-Mirror Break | Broken mirror bridge | 40 s | Phase bridges plus wind-field landing prediction. |
| 14 | Twin-Star Clocktower | Star gate clocktower | 42 s | Hybrid phase bridges plus star gates. |
| 15 | Phase Tide Court | Mirror-tide court | 78 s | Final synthesis of phase bridges, portals, wind, moving platforms, crystals, and hazards, sealed by 星潮守望者. |

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
  ├─ Astral Record -> main menu
  └─ Settings -> main menu

Gameplay
  ├─ Pause -> resume / restart / return to menu
  ├─ Portrait guidance -> continue in portrait / return to menu
  └─ Completion -> next chapter / replay / chapter select
```

The desktop menu gives roughly 40 percent of its width to the brand, actions, and journey summary, with the paired hero composition occupying the remaining 60 percent. The primary action follows the current save, while the journey strip reports the current chapter, unlocked progress, selected companion, and collected star dew. Narrow fine-pointer screens stack the composition; coarse-pointer landscape uses a shorter two-column arrangement; portrait keeps the menu scrollable and crops the hero art deliberately.

The Astral Record screen opens with an instrument summary of achievements, star marrow, trial medals, three-star chapters, flawless clears, lifetime star dew, longest chain, fastest clear, and restarts, then lists six achievement groups. Unearned entries stay quiet; secret entries stay unnamed until earned. The completion report shows rating, star dew, time, best, par, and longest chain, then medal, marrow, flawless, and record marks, then anything newly entered into the record.

Character selection uses horizontal artifact sheets with portrait, ability copy, and an explicit selected state. On narrow portrait screens, the sheets become a swipeable row. Chapter selection groups five chapters into each named world track, marks the current step, and states why locked chapters are unavailable. Each card carries a trial medal, a star-marrow mark, and, on the three finales, a warden mark, placed on the card footer opposite the state line. Settings use separate Audio, Display, Touch, Assist, and Local Data groups with live values for every range.

The HUD separates character, health, and status on the left from resources, time, skill, and pause on the right. A narrow route line shows chapter progress. A chain readout appears only while a chain is live. A warden bar replaces the route line's role during a guardian encounter, carrying the guardian's name, its current tell, and remaining star force. Responsive rules remove secondary readings before essential controls, while the World 3 phase status remains visible. Touch play uses a sliding direction rail on the left and separate jump, skill, and projectile seals on the right; saved size and opacity settings apply without reducing the minimum touch target.

On a coarse-pointer portrait viewport, gameplay pauses behind an orientation dialog. The player may continue in portrait or return to the menu, and rotating the device resumes the normal layout. Pause, outcome, orientation, and easter-egg dialogs isolate the inactive surfaces, contain keyboard focus, clear gameplay input, and freeze simulation where required.

## Save Data

Save data is stored in localStorage under `nini-yuan-save-v1`. The current schema version is 4.

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
- `settings.assist.enabled`
- `settings.assist.invulnerable`
- `settings.assist.infiniteSkill`
- `settings.assist.extraJump`
- `settings.assist.speed`
- `marrow`
- `wardens`
- `flawless`
- `achievements`
- `clears.nini`
- `clears.yuan`
- `stats.deaths`
- `stats.stomps`
- `stats.bestCombo`
- `stats.wardenFlawless`
- `stats.letters`
- `assistUsed`

| Setting | Default | Accepted values |
| --- | --- | --- |
| Master volume | 70 | 0 to 100 |
| BGM volume | 60 | 0 to 100 |
| Touch size | 76 px | 64 to 84 px |
| Touch opacity | 68% | 45 to 100% |
| HUD scale | 100% | 90 to 140% |
| Camera shake | On | On or off |
| High-frame-rate effects | On | On or off |
| Assist mode | Off | On or off |
| Assist invulnerability | Off | On or off |
| Assist skill cooldown relief | Off | On or off |
| Assist bonus air jump | Off | On or off |
| Assist game speed | 100% | 60 to 100% |

Loading applies schema validation, type clamping, and chapter ID allow-listing. Schema 4 adds star marrow, warden, flawless, and achievement records, per-character clear counts, lifetime statistics, and assist preferences while retaining the existing storage key. Older saves receive safe defaults for the new fields and clamp to the fifteen-chapter cap. Completed Aurora Citadel progress derives chapter 6 access, and completed Ring Conservatory progress derives chapter 9 access.

Record maps collapse to exactly 1 and reject any key that is not an allow-listed chapter or achievement id, so a hand-edited save cannot smuggle arbitrary numbers into a count. Assist toggles accept only a real boolean `true`, and assist speed clamps to 60 through 100. If localStorage is unavailable or tampered with, the game falls back to safe defaults.

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
- v1.9.0: presentation pose blending, pure input edge helpers, quieter ambient and brand ornament, calmer structural motion, and clearer touch press seals. Physics, chapters, and save schema remain unchanged.
- v2.0.0: three world-finale wardens, star lanterns, star marrow, chain scoring, trial medals, a thirty-entry astral record, assist mode, two hostile types, and a deeper Canvas playfield. The fifteen chapters, character movement tuning, and fixed-step physics are unchanged; the save schema advances to 4.
- Future release: local replay or ghost racing, subject to a separate scope review.
