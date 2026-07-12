# Interface and presentation polish: v1.9.0

Version scope: `v1.8.0` to `v1.9.0`

Date: 2026-07-12

Repository: `iwannabewater/NiniWithYuan`

## Goal

Polish the existing Song-atlas interface and character presentation so hierarchy, control feedback, and pose readability improve without changing chapters, physics, or save compatibility.

## Design constraints

1. Decoration stay subordinate to hierarchy. Ornament that does not orient, confirm, or protect is reduced until content is readable at a glance.
2. Keyboard, touch, and assistive sources remain source-counted. Latest direction wins. Lifecycle boundaries clear held actions, edges, and pointer refs together.
3. Simulation owns gameplay truth. Presentation may blend bob, lean, stretch, and lift, and must not write into player entities, saves, or terminal outcomes.
4. The smallest supported viewport sets the control and density budget. Larger screens may add space, not essential information.
5. Song-atlas materials remain the product identity: lacquer, indigo silk, aged gold, carved jade, and dusty rose. Restraint is layered on that system rather than replacing it.

## External references

| Source | Transfer into this release |
| --- | --- |
| Paper-and-ink product restraint (sparse field, one structural accent, calm ease-out motion) | Lower ambient weight; single aged-gold brand undertrace; ease-out on structural surfaces |
| Celeste forgiveness notes | Keep coyote time, jump buffer, and glide-intent windows pinned |
| Dead Cells control primacy | Keep latest-direction arbitration and multi-source holds |
| Ori polish coordination | Keep pose sampling, HUD, and touch press feedback aligned to one event clock |
| Apple / Android / Xbox input guidance | Semantic buttons, dual-zone touch reach, focus isolation, visible pressed state |
| ADR-0003 | UI and CSS may restructure; mechanics, offline, and accessibility outcomes stay fixed |

## Implementation

### Input

- Export pure edge helpers for pressed and released transitions so tests drive the same math as runtime arbitration.
- Leave coyote time (120 ms), jump buffer (140 ms), glide intent (120 ms), ground launch (≤140 ms), and reverse (≤190 ms) contracts unchanged.

### Presentation

- Add pure `blendMotionPose` and `shouldHoldLandingPose` helpers in `src/render/character-motion.js`.
- Blend bob, lean, stretch, and lift between consecutive resolved poses; snap on hurt, skill, and land entries and on camera or player discontinuities.
- Keep pose priority, airborne jump/fall on direction change, and fast land handoff to run.

### Interface

- Add a v1.9 composition boundary in `styles.css` with spacing tokens, quieter ambient weight, single-accent brand undertrace, calmer panel materials, clearer primary action hierarchy, stronger touch press seals, and denser non-overlapping corner instruments.
- Keep bans: no `transition: all`, no `backdrop-filter` glass, no neon-dominant hierarchy.

### Release packaging

- Bump package version, ambient footer, service-worker cache key, and Android `versionCode` / `versionName`.
- Add `tests/quiet-observatory-v1_9_0.js` and wire it in `tests/run-all.js`.
- Update `CHANGELOG.md`, `docs/DESIGN.md`, `docs/MOTION.md`, `docs/GDD.md`, and the plans index.

## Behavioral contract

- Physics constants, chapter geometry, win/lose rules, stomp and projectile patterns, ammo caps, portals, and phase-tide period are unchanged.
- Save schema remains 3; settings keys remain compatible.
- Presentation state stays outside player entities and saves.
- Reduced motion still disables hit-stop and camera lead, and quiets decorative loops.
- Offline PWA operation and Chinese-primary product copy remain required.

## Non-goals

- New worlds, enemy types, story rewrite, or combat economy redesign.
- Replacing Song-atlas identity with an unrelated art system.
- Store marketing campaign or additional localization languages.

## Verification

- `node tests/input-state.js`
- `node tests/character-motion.js`
- `node tests/quiet-observatory-v1_9_0.js`
- `node tests/experience-overhaul-v1_8_0.js`
- `node tests/e2e/ui-layout-integrity.js`
- `node tests/browser-smoke.js`
- `npm test`
- Package metadata: web `1.9.0`, Android `versionCode=19` / `versionName=1.9.0`, service-worker cache `nini-yuan-v1.9.0-quiet-observatory-r1`

## Completion notes

- `npm test` and `node tests/browser-smoke.js` passed on 2026-07-12.
- PR #15 merged to `main`; feature branch removed on remote.
- Annotated tag `v1.9.0` and GitHub release publish `dist/NiniYuan.apk`.
- APK badging reports package `com.iwannabewater.niniyuan`, `versionCode=19`, `versionName=1.9.0`, `minSdkVersion=23`, and `targetSdkVersion=36`. Signature schemes v1, v2, and v3 verify.
- APK SHA-256: `7370144e970966fc6983fc6e8008e3bdadf7bc3ae680df98f7fe3a22579dc02e`.

## Release boundaries

- Minor polish release.
- No new runtime dependency, save key, network service, analytics, or chapter content.
- Build outputs under `build/`, `dist/`, and `android/app/src/main/assets/` remain ignored.
