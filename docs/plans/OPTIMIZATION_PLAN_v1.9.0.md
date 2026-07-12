# Quiet Observatory polish: v1.9.0

Version scope: `v1.8.0` to `v1.9.0`

Date: 2026-07-12

Repository: `iwannabewater/NiniWithYuan`

## Objective

Raise the already-playable Song-atlas build from “usable” to a quieter, more decisive instrument. The release does not rewrite chapters or physics. It restructures friction that still sits between the player and intent: competing decoration, laggy pose transitions, uneven control feedback, and layout density that forces re-reading.

## First principles (resolve “颠覆” inside contracts)

1. **One material field.** Decoration must never compete with hierarchy. If an ornament does not orient, confirm, or protect, lower it until the content is readable at a glance.
2. **One action model remains law.** Keyboard, touch, and assistive sources stay source-counted. Latest direction wins. Lifecycle boundaries clear everything together.
3. **Simulation owns truth; presentation samples it.** Pose blending, lean, bob, and shadow may smooth, never write back into the player entity, saves, or terminal outcomes.
4. **Smallest supported viewport budgets the control surface.** Larger screens may breathe; they may not invent essential information.
5. **KAMI transfer is restraint, not a second skin.** Quiet fields, sparse ornament, tactile edges, calm transitions. Song-atlas lacquer, silk, aged gold, rose, and jade remain the identity.
6. **Proof over taste.** Green tests, store-contract preservation, and a multi-perspective rubric score gate the claim of completion.

## SOTA + KAMI transfer notes

| Source | Transfer (not clone) |
| --- | --- |
| KAMI / paper quietness | Lower ambient weight; one dominant accent edge; calm ease-out motion; no spring bounce on structural surfaces |
| Celeste forgiveness | Preserve coyote, jump buffer, and glide-intent windows; never loosen them without tests |
| Dead Cells control primacy | Keep latest-direction arbitration and held multi-source actions as the feel authority |
| Ori polish coordination | Couple pose blend, HUD pulse, and touch press feedback so one event reads once |
| Apple / Android / Xbox input HIG | Semantic buttons, reachable dual-zone touch, focus isolation, visible pressed state |
| Song-atlas ADRs | UI restructure free under ADR-0003; mechanics, offline, a11y outcomes preserved |

## Implemented scope

### Input and response fluidity

- Keep source-counted actions and latest-direction arbitration unchanged in contract.
- Export pure edge helpers for pressed/released transitions so lifecycle tests drive the same math as the runtime.
- Preserve coyote 120 ms, jump buffer 140 ms, glide intent 120 ms, ground launch ≤140 ms, reversal ≤190 ms.

### Presentation sensitivity

- Add pure `blendMotionPose` and landing-readability helpers in `src/render/character-motion.js`.
- Sample previous and current motion pose in presentation state; blend bob/lean/stretch/lift across frames with discontinuity snaps.
- Keep pose priority order; keep airborne turns as jump/fall; keep fast land handoff to run.

### UI layout and instrument quietness

- Add a v1.9 Quiet Observatory composition boundary in `styles.css`.
- Introduce spacing tokens, quiet ambient weight, single-accent brand undertrace, calmer panel materials, clearer primary action hierarchy, stronger touch press seals, and denser but non-overlapping corner instruments.
- Ban-preserving rules: no `transition: all`, no glassmorphism/`backdrop-filter`, no neon cyan-on-dark dominance.

### Engineering close-out

- Bump package, ambient footer, service-worker cache, Android `versionCode`/`versionName`.
- Add `tests/quiet-observatory-v1_9_0.js` plus wiring in `tests/run-all.js`.
- Update `CHANGELOG.md`, `docs/DESIGN.md`, `docs/MOTION.md`, plans index, and multi-perspective review.

## Behavior contracts (must hold)

- Physics constants, chapter geometry, win/lose, stomp/projectile patterns, ammo caps, portals, phase-tide period unchanged.
- Save schema remains 3; settings keys compatible.
- Presentation state stays outside player entities and saves.
- Reduced motion still disables hit-stop and camera lead and quiet decorative loops.
- Offline PWA and Chinese-primary copy preserved.

## Multi-perspective rubric (completion gate)

| Dimension | Weight | Target |
| --- | --- | --- |
| Interaction fluidity & fairness | 20 | ≥99.9 |
| UI layout & material coherence | 25 | ≥99.9 |
| Character presentation sensitivity | 20 | ≥99.9 |
| Accessibility & orientation safety | 15 | ≥99.9 |
| Engineering hygiene & docs fidelity | 20 | ≥99.9 |

Overall target: ≥99.9 with zero open Critical/Structural findings. Scored in `docs/plans/REVIEW_v1.9.0.md` after verification.

## Verification plan

1. `npm test` twice → exit 0; logs under implementer scratch.
2. `node tests/browser-smoke.js` twice → exit 0 when Playwright works.
3. Focused pure tests drive real `input-state` and `character-motion` helpers (blend, edge, land readability).
4. Screenshots of menu and gameplay under scratch `screens/` when browser path works.
5. Review artifact overall ≥99.9; version metadata consistent.
6. Named branch/PR merged; remote feature branch deleted.

## Verification recorded

- Two consecutive `npm test` runs exited 0 on the release commit path.
- Two consecutive `node tests/browser-smoke.js` runs exited 0 (11 scenarios each).
- Focused pure checks: `tests/quiet-observatory-v1_9_0.js`, extended `tests/character-motion.js`, `tests/input-state.js`.
- PR #15 merged as `049b095`; remote feature branch deleted; default branch clean.
- Multi-perspective review: overall 99.94, zero Critical/Structural findings (`docs/plans/REVIEW_v1.9.0.md`).

## Non-goals

- New worlds, enemies, story rewrite, balance redesign.
- Replacing Song-atlas with a KAMI paper-puzzle clone.
- Store marketing campaign or non-Chinese localization.
- Treating subjective “feels perfect” without tests and review as done.
