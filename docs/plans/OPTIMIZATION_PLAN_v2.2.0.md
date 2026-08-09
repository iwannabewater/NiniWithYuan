# v2.2.0 人物金相 / Gilded Companions Release Plan

## Status

This document records the implemented v2.2.0 release-candidate scope. It does
not assert that a tag, GitHub Release, APK, or live deployment exists.

## Scope

Gilded Companions improves the character-facing presentation surface without
changing gameplay contracts. Character selection cards gain a signature chip
inside each portrait, the HUD companion pill gains a live character sigil, and
the Canvas runtime draws a stateless gilded vignette under the existing
production sprite. The local WenKai subsets are refreshed to cover the new
runtime copy, and the release metadata moves to web 2.2.0, Android versionCode
23, and cache `nini-yuan-v2.2.0-gilded-companions-r1`.

## Problems Addressed

1. Character selection still relied on the two cards sharing the same portrait
   without a per-protagonist artifact label near the crop.
2. The HUD companion pill identified the character by name only, which made the
   left instrument feel generic during repeated runs.
3. The existing single-frame atlas had reached a v2.1.0 baseline, but the sprite
   read as too quiet before motion envelopes and trails began.
4. New runtime punctuation and the release title needed font-subset coverage.

## Implemented Design

### Character selection inscriptions

Nini and Yuan keep the approved paired illustration and the existing CSS crop.
Each portrait now includes a non-layout signature chip inside the portrait area.
Nini reads as `璇玑星盘 · 星轨校正`, and Yuan reads as `青玉圭剑 · 风衡引路`.
The chip is presentational, `aria-hidden`, and uses existing Night Observatory
texture rather than a new pill system.

### HUD sigil

The left HUD companion pill adds a 26 px sigil: `璇` for Nini, `青` for Yuan.
It is updated with the runtime's character instrument lookup, so the visible
mark cannot drift from the selected character. All other HUD order and
responsive rules remain unchanged.

### Stateless Canvas gilding

`src/render/character-gilding.js` provides:

- `resolveCharacterInstrument(id)`, returning the character mark and artifact
  label for menu and HUD use.
- `resolveCharacterRhythm(input, options)`, returning presentation-only breath,
  cloth, focus, and stride-draft values.
- `drawCharacterVignette(ctx, options)`, drawing a low-alpha overhead arc,
  shoulder-to-hip cloth echo, and stride draft around the current atlas frame.

The helper is DOM-free and does not read viewport size or device pixel ratio.
Reduced-motion play freezes breath, cloth, and draft layers. The runtime draws
the vignette under the sprite bitmap and does not add gameplay state, physics,
or save fields.

### Preserved Invariants

- Fixed simulation remains `1 / 120` with the existing overload policy.
- Gameplay entity simulation does not read viewport dimensions or device pixel
  ratio.
- Character movement, collision geometry, enemy spawns, routes, save schema,
  input arbitration, chain rules, collection ratings, assist rules, and
  terminal outcomes stay unchanged.
- The sprite draw path keeps `shadowBlur` off the character bitmap itself.

## Verification

- Run `npm test`, including `tests/character-gilded-v2_2_0.js`, the existing
  unit and E2E suite, and `tests/browser-smoke.js`.
- Rebuild local WenKai subsets after real runtime CJK additions and record the
  printed bundled file digest values in `assets/fonts/NOTICE.md`.
- Take a desktop and compact-landscape screenshot review after any further
  character UI change.
- Run Android CI for the final commit before publishing release assets.

## Residual Follow-up

This release still uses the existing one-cell atlas states. The gilding helper
improves how the sprite sits in the world, but multi-frame authored loops remain
a separate art and asset task.
