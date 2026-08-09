# v2.3.0 局境生息 / Living Field Release Plan

## Status

This document records the implemented v2.3.0 release-candidate scope. No tag or
GitHub Release exists at this snapshot.

## Scope

Living Field improves how common enemies, obstacles, and playfield surfaces
read without changing gameplay. Ground creatures get a smaller grounding core
and warm ember flecks; platforms get quiet seam studs; hazards get a clearer
reading line; springs read as seated instruments with a lintel knob. The
release also refreshes the local WenKai subsets for the new runtime `境` glyph.

## Preserved Invariants

- Fixed simulation remains `1 / 120` with the existing overload policy.
- Collision geometry, entity dimensions, enemy patrols, routes, saves, input
  arbitration, assist rules, and movement tuning remain unchanged.
- All new detail remains stateless render code and does not write player
  entities or save data.

## Verification

- Run `npm test`, including `tests/living-field-v2_3_0.js` and
  `tests/browser-smoke.js`.
- Rebuild local WenKai subsets after adding runtime CJK copy and record the
  printed WOFF2 digests.

## Residual Follow-up

The battle-art and obstacle ruleset remain unchanged. This release improves
material richness, not enemy behavior or level design.
