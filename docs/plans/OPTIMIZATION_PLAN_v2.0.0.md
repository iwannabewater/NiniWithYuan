# v2.0.0 Astral Echo — Release Plan

## Scope

v2.0.0 is the first major version. It adds a meta-progression layer, three
world-finale boss encounters, two hostile types, mid-chapter checkpoints, chain
scoring, and an assist mode, then rebuilds the interface surfaces those systems
need. The Song-atlas Night Observatory direction, the fifteen authored chapters,
and the character movement tuning are unchanged.

The release name is **星穹回响 / Astral Echo**: the atlas answers back once every
route has been walked.

## Problem Statement

v1.9.0 shipped a complete fifteen-chapter platformer with a coherent visual
system and no reason to return to a chapter after clearing it. Five specific
gaps drove this release.

1. **No terminal challenge.** Fifteen chapters ended on the same slime, ember,
   and wisp vocabulary introduced in chapter one. Each world finale read as a
   longer chapter rather than an arrival.
2. **No meta-progression.** `bestTimes` and `levelStars` were recorded and never
   used for anything beyond a chapter card line. Nothing accumulated across the
   file.
3. **A fall ended the attempt.** Leaving the floor called `hurt(3, true)`, which
   zeroed a full health bar and opened the failure dialog. A single missed jump
   at chapter fifteen discarded roughly two minutes of play.
4. **No accessibility ramp.** The only difficulty control was skill. Players who
   wanted the fiction had no supported way to reach it.
5. **The playfield lagged the menus.** Chapters authored four palette entries but
   only two reached the sky, so every chapter rendered against the same flat
   dark and platforms read as stickers rather than solids.

## Design

### 守望者 / Wardens

Chapters 5, 10, and 15 gain a guardian. Entering the final platform's arena wakes
it, seals the arena's left edge, and locks the gate until the guardian falls.

- One data-authored encounter model serves all three: health pool, arena span,
  ground line, hover home, and three escalating stages.
- Stages widen the attack pool and shorten the cadence as health drops:
  `volley` (aimed fan), `rain` (telegraphed falling shards), `sweep` (grounded
  charge), `summon` (two wisps).
- Every attack opens with a 0.55 s telegraph. The guardian then drops into
  player reach for its recovery beat, which is the only window where projectiles,
  stomps, and dashes land. The fight is read-and-answer, not attrition.
- Health pools are 16, 20, and 24. Nini lands roughly four bolts per opening and
  Yuan roughly two dash hits, so a clean fight runs three to five exchanges.

### 星灯 / Star lanterns

Every chapter derives two or three checkpoints from its authored main platforms,
never over a hazard. Touching one lights it and moves the respawn anchor. A fall
now costs one heart and returns the player to the last lit lantern. Chapters
sealed by a warden also place a lantern just before the arena.

### 星髓 / Star marrow

One hidden collectible per chapter, fifteen total, placed off the forward route
and above the optional elevated line. Marrow is recorded the moment it is
touched, so a later failure never takes it back.

### 连星 / Chain

Defeats, gems, and warden hits extend a 2.4 s chain. Every three links raise a
multiplier, capped at five. The multiplier only ever adds star dew. The
collection rating still reads `player.collectedValue`, which takes the authored
pickup value and nothing else, so chain play cannot buy a star.

### 章印 / Trial medals

Each chapter declares a `par` time. A recorded best at or under par earns 星章,
within 1.25x earns 月章, and within 1.6x earns 露章. Par times were calibrated
against measured route times rather than guessed, so a medal means a deliberate
route.

### 星录 / Astral Record

Thirty achievements across six groups: journey, wardens, collection, trials,
mastery, and secrets. The two secret entries stay sealed until earned. Achievement
predicates are pure functions of the sanitized save plus chapter metadata, so
they are evaluated, not incremented, and cannot drift.

### 星辉护佑 / Assist mode

Four opt-in helpers plus a 60 to 100 percent game-speed control. Assist scales
the delivered frame, never the fixed step, so physics constants, coyote time,
jump buffer, and the step budget are untouched. Assisted runs unlock chapters and
record stars and marrow; they do not write best times or medals, and any assist
use in the file disqualifies the 独行星路 secret. The consequence is stated in
the settings group rather than discovered later.

### New hostiles

- **哨星 sentry**: a fixed emplacement that faces the player, telegraphs, and
  fires one slow bolt. The answer is position, not reaction speed.
- **石胄 warder**: a shelled walker that deflects projectiles. Only stomp, dash,
  or invulnerability answers it.

### Playfield depth

The chapter accent and glow entries now light a horizon wash behind the mid
ridge, tint the farthest ridge for aerial perspective, drive a parallax dust
layer, and fade the near ridge into a ground haze. Platforms cast a short shadow
under the lip. The wash is deliberately held at low opacity: the gameplay layer
must stay the highest-contrast thing on screen.

## Non-Goals

- No new chapters. Fifteen remains the shape.
- No change to jump height, gravity, dash distance, glide tuning, coyote time,
  jump buffer, or the 120 Hz fixed step.
- No online features. The game stays offline and local-only.
- No new art direction. Every new surface is built from existing materials.

## Save Schema 4

Schema 4 adds `marrow`, `wardens`, `flawless`, `achievements`, `clears`, `stats`,
`assistUsed`, and `settings.assist` under the existing storage key. Schema 3 saves
load unchanged and receive empty records and default assist settings.

Flag records collapse to exactly 1 and reject unknown chapter or achievement ids,
so a hand-edited save cannot smuggle arbitrary numbers into a count. Assist
toggles accept only a real boolean `true`; assist speed clamps to 60 to 100.

## Interface

- **星录 screen**: an instrument summary row over six grouped achievement lists,
  with unearned entries quiet and sealed entries unnamed.
- **Completion report**: rating, star dew, time, best, par, longest chain, then
  medal, marrow, flawless, and record marks, then any newly earned achievements.
- **Chapter cards**: medal, marrow, and warden marks on the card footer opposite
  the state line, where a long chapter name cannot push them past the card edge.
- **In-play instruments**: a chain readout that exists only while a chain is
  live, and a warden bar carrying the guardian's name, current tell, and
  remaining star force.
- **Assist group**: five controls with a stated consequence, and a lit legend
  while active.

## Verification

- `npm test` covers the new pure helpers, save schema 4 sanitizing, chapter
  tuning placement, warden encounter data, interface contracts, and the existing
  physics, input, accessibility, layout, and release-metadata suites.
- `tests/astral-echo-v2_0_0.js` is the release guard. It asserts marrow is never
  buried in a platform, hazard, or moving-platform sweep; lanterns stand on a
  platform and clear of hazards; every sentry and warder spawns grounded; arenas
  contain their gate; and the chain can never touch the collection rating.
- Per-release version allow-lists in the older guards were replaced with a shared
  `tests/helpers/release.js` floor comparison, and the font digests moved into
  `assets/fonts/NOTICE.md` as the single source of truth. Both were recurring
  release chores that drifted.

## Release Metadata

| Surface | Value |
| --- | --- |
| `package.json` / `package-lock.json` | `2.0.0` |
| Service worker cache | `nini-yuan-v2.0.0-astral-echo-r1` |
| Android | `versionCode=21`, `versionName=2.0.0` |
| Ambient strip | `星图 · v2.0.0 · 星穹回响 · 离线游玩` |

The local WenKai 500 and 700 subsets were rebuilt from the pinned
[LXGW WenKai v1.522](https://github.com/lxgw/LxgwWenKai/releases/tag/v1.522)
sources for 662 runtime code points, covering the 48 new glyphs this release
introduced. `scripts/build-font-subsets.sh` makes the rebuild reproducible.
