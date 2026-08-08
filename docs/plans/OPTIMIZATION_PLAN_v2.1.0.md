# v2.1.0 星野律动 / Starfield Cadence Release Plan

## Status

This document records the implemented v2.1.0 release-candidate scope. It does
not assert that a tag, GitHub Release, APK, or live deployment exists.

## Scope

Starfield Cadence improves how the existing game reads over time and at compact
viewport sizes. It adds elapsed-time pose damping, event-shaped character
effects, stateless creature materials, deterministic world props, shaped
particles, a 13 px HUD floor, clearer guardian identities, and a centralized
recover-only guardian damage rule. Android candidate artifacts gain a verified
checksum and commit-specific upload path.

The release keeps fifteen chapters, two playable characters, schema 4 saves,
the Song-atlas art direction, and the v2.0.0 progression systems.

## Problems Addressed

1. Pose blending used a fixed alpha per rendered frame, so a transition settled
   on different timelines at different display refresh rates.
2. Each character state has one authored raster frame. Contact, cast, and skill
   beats depended heavily on transform motion and could read as a sliding cutout.
3. Enemy art lived inside the gameplay hotspot, and compact-screen silhouettes
   were smaller than the established readability target.
4. Every world reused the same low-level scenery vocabulary, while many combat
   and movement events reused one circular particle burst.
5. The HUD type floor and gameplay toast position could trade away legibility or
   cover the protagonist on short landscape screens.
6. The documented guardian recovery rule was not enforced at the shared damage
   entry, and all three guardians shared one stage order.
7. The Android workflow built an APK but did not retain a verified checksum with
   the uploaded candidate.

## Implemented Design

### Temporal character presentation

Continuous bob, lean, stretch, and lift fields damp from the displayed pose to
the latest resolved pose with `1 - exp(-22 * dt)`. The delta uses simulation
time and caps at 0.1 s. Hurt, skill, and land entries still snap where immediate
feedback matters. This changes presentation convergence only; animation state,
collision, and action timing remain simulation-owned.

`src/render/character-effects.js` adds stateless action envelopes around the
current atlas frame:

- a 0.2 s landing contact mark;
- a 0.18 s projectile cast seal;
- a 0.24 s Nini star-dial orbit or Yuan gui-sword cut;
- restrained run and skill afterimages.

Reduced-motion play removes sprite trails and movement traces. It keeps static
contact, cast, and signature skill marks so action state remains readable.

### Creature readability boundary

Slime, ember, and wisp drawing moves to `src/render/creature-material.js`.
Sentries and warders remain in the stateless guardian material helper. Ground
creatures render at 1.36 presentation scale; wisps, sentries, and warders render
at no less than 1.28. Feet, shadows, and tethers hold the same contact anchors.

The drawing scale does not change entity dimensions, collision rectangles,
support-platform lookup, patrol limits, health, damage, or projectile rules. No
new enemy type or physics rule enters this release.

### World props and particles

`src/render/playfield-material.js` derives three non-colliding prop grammars from
world id, level id, and authored platform index:

| World | Grammar | Placement rule |
| --- | --- | --- |
| World 1 | Star bloom | Stable seed on eligible solid platforms |
| World 2 | Gate beacon | Stable seed on eligible solid platforms |
| World 3 | Mirror reed | Stable seed on eligible solid platforms |

Props draw behind solids, skip phase and breakable platforms, freeze decorative
sway under reduced motion, and never join entity simulation.

The particle renderer supports orb, shard, streak, ring, petal, and glow forms.
Current gameplay events select rings for takeoff or impact, streaks for velocity,
and shards for fracture. Existing particle lifetime remains authoritative.

### HUD clear rail

Every visible gameplay instrument keeps a 13 px default type floor, including
compact landscape HUD buttons and the World 3 phase status. The compact pause
control retains its 48 px target. While the overlay is active, transient gameplay
notices move to a top-center safe rail below the progress instruments. Menu
notices keep their existing lower placement.

### Guardian damage and identity

`damageWarden` is the sole damage arbitration entry. Projectile, stomp, and
impact sources reduce star force only during `recover`. A closed-shell hit uses
the existing moon-white armour flash, `护甲` label, and deflect cue. It adds no
guardian hurt count, chain reward, or hit-stop.

Caller consequences stay intentional:

- ordinary body contact still damages the player;
- stomps still bounce in every phase;
- impact attacks still set their contact cooldown;
- a non-piercing projectile is consumed, and a piercing projectile spends one
  pierce while retaining its remaining lifetime.

The authoritative arenas are 20 tiles for Aurora Citadel, 12 tiles for Island
Star Core, and 22 tiles for Phase Tide Court.

| Profile | Stage 1 | Stage 2 | Stage 3 |
| --- | --- | --- | --- |
| Aurora | 2.4 s: `volley`, `sweep` | 2.0 s: `volley`, `rain`, `sweep` | 1.65 s: `rain`, `sweep`, `volley`, `summon` |
| Core | 2.5 s: `sweep`, `volley` | 2.05 s: `sweep`, `summon`, `volley` | 1.7 s: `volley`, `summon`, `sweep`, `rain` |
| Tide | 2.3 s: `rain`, `volley` | 1.9 s: `rain`, `sweep`, `volley` | 1.55 s: `rain`, `volley`, `summon`, `sweep` |

All profiles use the existing `patterns` and `updateWarden` path. Aurora receives
a radial crown, Core squared satellites, and Tide crescent arcs. Recovery opens
the rings and core, telegraph closes across the core, and low health adds fracture
marks. These are visual state readings, not new encounter states.

### Release artifact hardening

The candidate aligns these metadata surfaces:

| Surface | Candidate value |
| --- | --- |
| `package.json` and `package-lock.json` | `2.1.0` |
| Service-worker cache | `nini-yuan-v2.1.0-starfield-cadence-r1` |
| Android | `versionCode=22`, `versionName=2.1.0` |
| Ambient strip | `星图 · v2.1.0 · 星野律动 · 离线游玩` |

Every workflow action is pinned to a reviewed commit, and repository policy
requires full-SHA references while allowing only GitHub-owned actions and the
reviewed Android setup pin. Pull-request smoke runs with read-only contents
permission and no signing, OIDC, attestation, or upload authority. On main
pushes, Android CI restores the protected signer used by the latest public APK
line, verifies its
certificate SHA-256, removes the key after packaging, creates and verifies
`NiniYuan.apk.sha256`, and attaches GitHub build provenance. Pull-request smoke
packages remain ephemeral and are never uploaded as release candidates.

The APK, checksum, and inspection records are retained together as
`NiniYuan-<commit-sha>` for 14 days, without recompression and with missing-file
failure. Only those exact downloaded CI bytes may enter a draft GitHub Release.
Tag commit, workflow `headSha`, main source ref, signer workflow, attestation
subject, and checksum must agree before the repository's enabled immutable
Release is published. Final badging, signer, archive-content,
installation, and live readback still apply to the published download.

## Preserved Invariants

- Fixed simulation remains `1 / 120` with the existing lifecycle clamp and
  eight-step overload policy.
- Gameplay simulation does not read viewport dimensions or device pixel ratio.
- Jump, gravity, dash, glide, coyote, buffer, wind, hazard, and route tuning stay
  unchanged.
- Player and enemy collision geometry stays unchanged.
- Input capture remains behind play mode and the editable-control gate. All
  focus, visibility, modal, menu, and orientation transitions clear transient
  input together.
- Schema 4, the storage key, chapter unlocks, achievements, medals, marrow, and
  checkpoint semantics stay unchanged.
- Chain rewards add star dew only. Collection rating still reads authored pickup
  value.
- Assist scales delivered time, never the fixed step, and assisted runs remain
  excluded from best times and trial medals.
- Lethal failure still takes precedence over completion in the same step.

## Verification Plan

- Exercise character damping at 30, 60, and 120 Hz and assert equal convergence
  over equal elapsed time.
- Exercise action envelopes, reduced-motion trail removal, creature scale, all
  three prop grammars, particle shapes, and guardian silhouettes through the
  stateless render helpers.
- Exercise every guardian phase against projectile, stomp, and impact sources,
  including health, hurt count, chain, hit-stop, player contact consequences,
  cooldown, bounce, and projectile pierce behavior.
- Check HUD computed sizes, compact target size, horizontal overflow, and toast
  placement in real browser layouts.
- Run the repository suite and cross-viewport browser smoke on the final commit.
- Run Android CI on the final commit, download its APK and checksum, then repeat
  checksum, badging, signature, archive, installation, and live device checks.

## Residual Follow-up

Both character atlas manifests still assign one raster cell to each state. This
release makes those states settle consistently and adds event-timed presentation
around them; it does not add multi-frame raster animation. Authoring and guarding
multi-frame idle, run, land, shoot, and skill cycles remains a separate art and
asset task.
