# Release review notes: v2.0.0

Date: 2026-07-26

Tag: `v2.0.0`

## Scope

The first major version. Meta-progression, three world-finale wardens, star
lanterns, star marrow, chain scoring, trial medals, assist mode, two hostile
types, and the interface surfaces those systems need. Playfield depth rebuilt
from each chapter's existing palette.

Out of scope: new chapters, movement tuning, fixed-step physics, online features,
and any change to the Song-atlas art direction.

## Findings addressed

| Issue | Cause | Fix |
| --- | --- | --- |
| A fall discarded the whole attempt | Leaving the floor called `hurt(3, true)`, which zeroed a full health bar and opened the failure dialog | A fall costs one health and returns the player to the last lit star lantern; every chapter derives two or three lanterns from its authored main platforms |
| World finales ended on the chapter-one enemy vocabulary | No terminal encounter existed | Three data-authored wardens seal the finale arenas behind telegraphed, stage-escalating fights |
| Nothing accumulated across the save | `bestTimes` and `levelStars` were recorded and never read beyond one card line | Trial medals, star marrow, per-character clears, lifetime statistics, and a thirty-entry astral record |
| No supported difficulty ramp | Skill was the only lever | Assist mode with four helpers and a game-speed control, with its record consequence stated up front |
| Playfield read flat against polished menus | Chapters authored four palette entries; only two reached the sky | Horizon wash, aerial-perspective ridge tint, parallax dust, ground haze, and a cast shadow under every platform lip |
| A guardian could not be reached from the ground | The first hover model kept the warden above projectile height for the whole fight | The guardian descends into player reach for its recovery beat, which became the encounter's core read |
| Chapter card marks overflowed the card edge | Medal, marrow, and warden marks were appended to a non-wrapping inline meta row | Marks moved to a card footer opposite the state line, and compact viewports shrink the marks to keep the footer one line tall |
| Forty-eight new glyphs fell back to a system font | The bundled WenKai subsets predated the v2.0.0 copy | Subsets rebuilt from the pinned v1.522 sources for 662 code points, with `npm run build:fonts` for reproducibility |

## Maintenance findings addressed

These were pre-existing chores this release removed rather than extended.

| Issue | Fix |
| --- | --- |
| Six regression guards carried enumerated version allow-lists that had to be edited every release | One `tests/helpers/release.js` floor comparison, asserting every release surface agrees with `package.json` |
| Bundled font digests were duplicated between a test literal and `assets/fonts/NOTICE.md` | The test reads the expected digests out of the notice, so a rebuilt subset with a stale notice now fails |
| The service-worker cache-isolation guard re-listed every historical cache key | The guard reads the current key from the shipped worker and asserts the invariant |
| A settings guard pinned an exact row count | It now asserts the property it names: every rune row reserves 44 px |

## Checklist

| Area | Result |
| --- | --- |
| Warden activation, seal, staged patterns, and defeat recorded | Pass |
| Fall returns to the last lit lantern instead of ending the run | Pass |
| Star marrow reachable, never buried in geometry, recorded on touch | Pass |
| Chain multiplies star dew only, never the collection rating | Pass |
| Trial medals calibrated against measured route times | Pass |
| Achievements evaluated from the save, not incremented | Pass |
| Assist scales the delivered frame, not the fixed step | Pass |
| Assisted runs excluded from best times and medals | Pass |
| Save schema 4 migrates schema 3 and rejects tampered records | Pass |
| Five menu actions and five settings groups fit 1280x720 and 568x320 | Pass |
| No Axe violations across the tested flows | Pass |
| Local font coverage for every runtime glyph | Pass |
| Packaging metadata aligned across every surface | Pass |

## Verification

- `npm test`: full suite green, including the new `tests/astral-echo-v2_0_0.js`
  guard and the existing physics, input, accessibility, layout, runtime-budget,
  and browser suites.
- `node tests/browser-smoke.js`: 11 cross-viewport checks pass.
- Play-tested chapter 1 and chapter 5 end to end in a real browser: the warden
  wakes, seals the arena, escalates through its stages, and records its defeat;
  the completion report writes ratings, marrow, medals, and achievements; and an
  assisted replay leaves the recorded best time untouched.

## Open findings

None.

## Packaging

| Item | Value |
| --- | --- |
| Web package | `2.0.0` |
| Service worker cache | `nini-yuan-v2.0.0-astral-echo-r1` |
| Android `versionCode` | `21` |
| Android `versionName` | `2.0.0` |
| Save schema | `4` |
| Ambient strip | `星图 · v2.0.0 · 星穹回响 · 离线游玩` |
