# Release review notes: v2.2.0 人物金相 / Gilded Companions

Date: 2026-08-09

Status: release candidate. No `v2.2.0` tag or GitHub Release exists at this
snapshot.

## Scope

Gilded Companions is a character presentation release over the existing fifteen
chapters. It adds character-signature inscription chips, a live HUD character
sigil, a stateless Canvas gilding helper, fresh font subsets, and v2.2.0 release
metadata.

Out of scope: new chapters, new enemy types, new physics, movement retuning,
collision changes, save migration, input changes, renderer-driven gameplay, and
online features.

## Findings Addressed

| Finding | Implemented correction |
| --- | --- |
| Character cards read as two copies of the same portrait | Each portrait now carries an `aria-hidden` signature chip naming the character artifact and role near the crop |
| The HUD companion pill only showed a name | A 26 px `璇` or `青` sigil appears beside the name and updates from the same runtime source as selection |
| Single-frame sprites can feel detached from surrounding motion | A stateless vignette draws restrained overhead, cloth, and stride layers under the existing frame while reduced motion freezes ambient movement |
| Runtime copy gained new CJK text | The pinned LXGW WenKai subsets were rebuilt and `assets/fonts/NOTICE.md` now records the new bundled digests |
| Release surfaces drifted from worktree | Web package, lockfile, ambient strip, service-worker cache, and Android version metadata now all carry `2.2.0` or `versionCode=23` |

## Preserved Invariants

- Fixed simulation remains `1 / 120` with the existing fixed-step overload guard.
- Gameplay entity simulation stays independent of viewport size and device
  pixel ratio.
- Character movement, collision geometry, save schema, input arbitration,
  chain boundary, collection rating, assist record rules, and terminal outcome
  precedence remain unchanged.
- Character bitmap drawing still avoids canvas shadow blur on the sprite itself.

## Verified Local Gates

| Gate | Result |
| --- | --- |
| `npm test` | Pass, including the new gilding contract and `browser-smoke: 11 passed` |
| `node tests/typography-copy-v1_4_0.js` | Pass after rebuilding both WenKai subsets |
| `node tests/character-gilded-v2_2_0.js` | Pass |
| `npm test` E2E layout suites | Pass |

Local Android build: not run because this workstation reports `Unable to locate a Java Runtime` from `java -version`, so the repository should rely on the Android CI job for the signed candidate and artifact reads.

## Pending Release Gates

- Run CI and Android Build Smoke on the exact intended release commit.
- Download `NiniYuan-<commit-sha>` from the successful main-branch workflow and
  verify checksum, badging, signer digest, WebView assets, and installation.
- Read back the published web build, service-worker cache, offline assets, and
  release metadata after deployment.
- Create `v2.2.0` at the verified workflow `headSha`, upload only the exact CI
  APK and checksum to a draft after immutable Release verification, then publish
  and verify locked assets.

## Residual Limitation

The milestone improves how the existing single-cell atlas reads through
stateless extra layers. Multi-frame authored loops for idle, run, land, shoot,
and skill remain a follow-up asset task.
