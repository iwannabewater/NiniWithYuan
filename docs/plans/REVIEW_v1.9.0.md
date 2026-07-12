# Release review notes: v1.9.0

Date: 2026-07-12

PR: [#15](https://github.com/iwannabewater/NiniWithYuan/pull/15)

Tag: `v1.9.0`

## Scope

Interface density and ornament weight, character presentation sampling, pure input edge helpers, release metadata, and documentation for the v1.9.0 polish.

Out of scope for this review: chapter content, physics constants, save schema changes, and store listing marketing.

## Checklist

| Area | Result | Notes |
| --- | --- | --- |
| Input fairness | Pass | Source-counted actions, latest-direction arbitration, and lifecycle clears preserved; pure edge helpers covered by unit tests |
| Layout and materials | Pass | Ambient weight reduced; single aged-gold brand undertrace; calmer panels and modals; clearer touch press seals; no `transition: all` or glassmorphism |
| Character presentation | Pass | Pose blend for bob/lean/stretch/lift; discrete snap on hurt, skill, and land; presentation state stays outside player entities |
| Accessibility and orientation | Pass | Modal isolation, portrait dialog, HUD scale, and reduced-motion behavior retained |
| Documentation and packaging | Pass | Web `1.9.0`, Android `19` / `1.9.0`, service-worker cache key aligned; CHANGELOG, DESIGN, MOTION, and GDD updated |

## Open findings

None.

## Verification commands

| Command | Result |
| --- | --- |
| `npm test` | Pass |
| `node tests/browser-smoke.js` | Pass |
| `node tests/quiet-observatory-v1_9_0.js` | Pass |
| `node tests/character-motion.js` | Pass |
| `node tests/input-state.js` | Pass |

## Packaging

| Item | Value |
| --- | --- |
| Web package | `1.9.0` |
| Android | `versionCode=19`, `versionName=1.9.0` |
| Service-worker cache | `nini-yuan-v1.9.0-quiet-observatory-r1` |
| APK SHA-256 | `7370144e970966fc6983fc6e8008e3bdadf7bc3ae680df98f7fe3a22579dc02e` |
| Signatures | v1, v2, v3 verified |

## Residual risk

`src/game.js` and `styles.css` remain large-file hotspots. Changes in this release stay localized to presentation sampling, pure helpers, and a composition boundary in CSS. Focused regression tests cover the new helpers and release metadata.
