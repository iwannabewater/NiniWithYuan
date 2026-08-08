# Release review notes: v2.1.0 星野律动 / Starfield Cadence

Date: 2026-08-09

Status: release candidate. No `v2.1.0` tag or GitHub Release exists at this
snapshot, and no live deployment is claimed here.

## Scope

Starfield Cadence is a presentation, readability, guardian-contract, and
artifact-delivery release over the existing fifteen chapters. It adds
elapsed-time pose damping, action contact and cast effects, stateless creature
materials, three deterministic world prop grammars, shaped particles, a 13 px
HUD floor, a top safe-rail gameplay toast, distinct guardian profiles and
silhouettes, and signer-anchored, provenance-backed Android candidates.

Out of scope: new chapters, new enemy types, new physics, movement retuning,
collision changes, save migration, input changes, renderer-driven gameplay, and
online features.

## Findings Addressed

| Finding | Implemented correction |
| --- | --- |
| Pose blending used a fixed per-frame alpha | Continuous pose fields now damp by simulation-time delta, with equal convergence over equal elapsed time at 30, 60, and 120 Hz |
| Single-frame character states lacked clear contact and release beats | Stateless landing, projectile-cast, Nini orbit, Yuan cut, and restrained trail envelopes now surround the current authored frame |
| Reduced motion still needed essential action feedback | Reduced-motion play removes afterimages and movement traces while retaining static contact, cast, orbit, and cut marks |
| Common enemy drawing enlarged the gameplay hotspot | Slime, ember, and wisp materials moved to a stateless, DOM-free creature renderer |
| Creature silhouettes read too small in compact landscape | Ground creatures render at 1.36 presentation scale; wisps, sentries, and warders render at 1.28 or larger, anchored to unchanged collision geometry |
| The three worlds reused one foreground vocabulary | Stable level and platform seeds now select star blooms, gate beacons, or mirror reeds behind authored solids |
| Combat and movement events reused circular bursts | The particle material now supports orb, shard, streak, ring, petal, and glow forms, with current events assigning rings, streaks, and shards by action |
| Compact HUD text fell below the documented floor | Every visible gameplay instrument now keeps a 13 px default floor, while the compact pause target remains 48 px |
| Gameplay notices could cover the protagonist | In-play toasts now use a top-center safe rail; menu notices keep their former lower placement |
| Closed-shell guardian hits could bypass the recovery rule | `damageWarden` now arbitrates every projectile, stomp, and impact source and accepts damage only during `recover` |
| All guardians shared one stage order | Aurora, Core, and Tide now own distinct deterministic pattern orders and cadence curves through the existing stage-data path |
| Guardian identity relied mostly on palette and one glyph | Aurora uses a radial crown, Core squared satellites, and Tide crescent arcs; telegraph, open recovery, and low-health state have separate silhouette marks |
| Android CI did not anchor the APK signer or source provenance | All workflow actions are commit-pinned; the PR smoke job is read-only and isolated from release authority; main pushes restore the protected latest-line signer, reject a certificate other than SHA-256 `23fe694d4adfb093a752c6a90f23086c6744bc520c89656079d78414979457e7`, remove the key after packaging, and attest the APK before retaining it with checksum and inspection records under the exact commit SHA |
| Warden arena documentation drifted from code | The documented arena widths now match the authoritative values: 20, 12, and 22 tiles |

## Guardian Contract Decisions

The centralized rule is phase-based, not source-based:

| Phase | Projectile | Stomp | Yuan impact or invulnerable impact |
| --- | --- | --- | --- |
| `wait` | Deflect | Deflect and bounce | Deflect and set contact cooldown |
| `telegraph` | Deflect | Deflect and bounce | Deflect and set contact cooldown |
| `act` | Deflect | Deflect and bounce | Deflect and set contact cooldown |
| `recover` | Damage | Damage and bounce | Damage and set contact cooldown |

A deflect produces one moon-white flash, the `护甲` label, and the existing
deflect cue. It causes no star-force loss, guardian hurt count, chain reward, or
hit-stop. Non-piercing projectiles are still consumed on contact. Piercing
projectiles still spend one pierce and retain their remaining lifetime. Ordinary
body contact still damages the player in every phase where bodies overlap.

The stage data is:

| Profile | Stage 1 | Stage 2 | Stage 3 |
| --- | --- | --- | --- |
| Aurora | 2.4 s: `volley`, `sweep` | 2.0 s: `volley`, `rain`, `sweep` | 1.65 s: `rain`, `sweep`, `volley`, `summon` |
| Core | 2.5 s: `sweep`, `volley` | 2.05 s: `sweep`, `summon`, `volley` | 1.7 s: `volley`, `summon`, `sweep`, `rain` |
| Tide | 2.3 s: `rain`, `volley` | 1.9 s: `rain`, `sweep`, `volley` | 1.55 s: `rain`, `volley`, `summon`, `sweep` |

## Preserved Invariants

- Fixed simulation remains `1 / 120`, with the same lifecycle clamp and
  overload policy.
- Character movement, abilities, wind, hazards, routes, entity dimensions, and
  collision geometry remain unchanged.
- Gameplay entity simulation remains independent of viewport size and device
  pixel ratio.
- Input capture, multi-source arbitration, transition clearing, and held-key
  suppression remain unchanged.
- Save schema 4 and the `nini-yuan-save-v1` storage key remain unchanged.
- Chain rewards add star dew only; collection rating still reads authored pickup
  value.
- Assist scales delivered time, never the fixed step, and assisted runs remain
  excluded from best times and trial medals.
- Lethal failure keeps precedence over completion in the same fixed step.

## Verified Local Gates

The following results describe this local candidate snapshot only. They do not
stand in for final-commit CI or downloaded-artifact checks.

| Gate | Result |
| --- | --- |
| `npm test` | Pass, including `browser-smoke: 11 passed` |
| Axe Core 4.13.0 and Playwright 1.62.1 | Current upstream verification toolchain installed; accessibility and browser smoke pass |
| `npm audit --audit-level=high` | Pass, 0 vulnerabilities |
| `npm outdated` | Pass, no outdated package reported |
| `npm run build:android` with the repository Temurin 17 toolchain | Pass; package `com.iwannabewater.niniyuan`, `versionCode=22`, `versionName=2.1.0`, min SDK 23, target SDK 36 |
| Local APK inspection | Pass; SHA-256 `be3636c2734dfe22fe0f300274e83167074d9bd140e575a31d48a9f51b8f3c40`, v1/v2/v3 signatures true, signer certificate SHA-256 `23fe694d4adfb093a752c6a90f23086c6744bc520c89656079d78414979457e7`; packaged `src/game.js` and `styles.css` hashes match the final local sources |
| GitHub Actions policy | Full-SHA pinning required; only GitHub-owned actions and `android-actions/setup-android@40fd30fb8d7440372e1316f5d1809ec01dcd3699` allowed |
| GitHub Release policy | Immutable Releases enabled for future publications |
| `node tests/docs-links.js` | Pass |
| Write punctuation gate on the six v2.1.0 documentation files | Pass |
| `git diff --check` | Pass |

## Pending Release Gates

- Run `CI`, `Android Build Smoke`, and Pages deployment on the exact intended
  release commit. No final CI status is claimed in this snapshot.
- Download `NiniYuan-<commit-sha>` from the successful main-branch workflow and
  verify its workflow `headSha`, main source ref, signer-workflow-bound provenance
  attestation, checksum, Android badging, version code and name, required signer
  digest, packaged WebView assets, and archive contents.
- Install the downloaded APK on an emulator or device and review compact HUD,
  toast clearance, character effects, creature scale, world props, and all three
  guardian openings and damage sources.
- Read back the published web build, service-worker cache, offline assets, and
  release metadata after deployment.
- Create `v2.1.0` at the verified workflow `headSha`, confirm immutable Releases
  remain enabled, upload only the exact CI APK and checksum to a draft, then
  publish and read back the locked assets after the gates above pass. No tag or
  Release exists yet.
- Verify the immutable Release and both published assets with `gh release verify`
  and `gh release verify-asset` after publication.

## Residual Limitation

Both character atlas manifests still assign one raster cell to each animation
state. This candidate improves temporal presentation through elapsed-time pose
damping, action envelopes, signature artifacts, and shaped event effects. It
does not add or claim new raster frames. Multi-frame idle, run, land, shoot, and
skill cycles remain the clearest follow-up for reducing the remaining paper-cutout
quality.

## Candidate Packaging

| Item | Candidate value |
| --- | --- |
| Web package | `2.1.0` |
| Service-worker cache | `nini-yuan-v2.1.0-starfield-cadence-r1` |
| Android `versionCode` | `22` |
| Android `versionName` | `2.1.0` |
| Save schema | `4` |
| Ambient strip | `星图 · v2.1.0 · 星野律动 · 离线游玩` |
| Tag | Pending |
| GitHub Release | Pending |
