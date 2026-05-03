# World 2 Star Gates Design

Date: 2026-05-03
Target release: v1.3.0
Status: Approved for written spec review
Repository baseline: v1.2.4, commit `4615216`

## Summary

The v1.3.0 update is a content expansion for `Nini & Yuan`. It keeps the current five handcrafted chapters, two playable characters, local save format, no-bundler web build, Android WebView wrapper, and Aurora Inkwash visual identity. It adds a second starfield, three new handcrafted chapters, and one lightweight new mechanic: paired star gates.

The existing five chapters become World 1, the broken atlas arc. The new chapters form World 2, the star-gate islands. Unlocking remains linear so the current numeric `save.unlocked` model continues to work. Difficulty follows the user's selected "content expansion first" direction: the new chapters should feel fresh and replayable, not like a hard postgame challenge.

## Approved Decisions

- Release shape: v1.3.0 content update.
- Content scope: add World 2 with three new chapters.
- Difficulty: comparable to the current five chapters, focused on variety and collection rather than punishment.
- New mechanic: paired star gates.
- Route structure: linear chapter unlock, not a branching map or separate challenge pack.
- Implementation gate: write and commit this design first; implementation starts only after spec review approval.

## Current Project Context

The current project is a static web and Android WebView game. Gameplay, level data, rendering, UI state, and input are concentrated in `src/game.js`; persistent save validation lives in `src/core/storage.js`; DOM rendering helpers live in `src/render/hud.js`; visual layout and motion live in `styles.css`.

The v1.2.x series mostly polished presentation and interaction. The core content baseline remains five chapters:

1. `sakura` - 星露花庭
2. `moonruin` - 月镜遗迹
3. `cloudsea` - 云海风帆
4. `crystalforge` - 辉晶锻炉
5. `auroracitadel` - 极光天城

The test suite already guards physics, pickups, dash/glide feel, wind behavior, enemy grounding, wisp readability, storage tampering, accessibility, PWA assets, Android wrapper safety, menu polish, and mobile layout. The expansion must update those contracts deliberately instead of bypassing them.

## Design References

External references were used as design principles, not as content to copy.

- Celeste's official positioning emphasizes a tight, handcrafted platformer, which supports making each new chapter a focused hand-authored route rather than procedural filler: https://www.celestegame.com/
- The GDC Celeste level-design listing highlights large volumes of handcrafted platforming stages and map arrangement, reinforcing the "teach, branch, combine" chapter arc: https://www.gdcvault.com/play/1024307/Level-Design-Workshop-Designing-Celeste
- Super Mario Bros. Wonder's official site frames new mechanics as a way to turn familiar platforming expectations, which supports one clear mechanic rather than many small systems: https://supermariobroswonder.nintendo.com/
- Ori and the Blind Forest's official page ties action-platforming to emotional visual storytelling, which fits a star-gate world that extends the atlas fiction: https://www.orithegame.com/blind-forest/
- "Generating Levels That Teach Mechanics" focuses on levels that introduce mechanics through play experience, matching the planned progression from safe portal teaching to combination challenges: https://arxiv.org/abs/1807.06734

## World Structure

World grouping is a chapter-select presentation layer. It does not require a new save schema or a new navigation screen.

World 1: 破碎星图

- Chapters 1-5 stay in their current order and keep their existing IDs, names, geometry, mechanics, collectibles, and star-rating rules.
- Existing saves still unlock and display the same chapters as before.

World 2: 星门群岛

- Chapter 6: `stargatecove`, 第六章 星门浅湾
- Chapter 7: `loopinglighthouse`, 第七章 回环灯塔
- Chapter 8: `ringconservatory`, 第八章 星环温室

Unlocking stays linear:

- finishing chapter 5 unlocks chapter 6;
- finishing chapter 6 unlocks chapter 7;
- finishing chapter 7 unlocks chapter 8;
- finishing chapter 8 returns to menu or replay/level select.

## Chapter Concepts

### Chapter 6 - 星门浅湾

Purpose: teach paired star gates with low pressure.

Design notes:

- Use one or two portal pairs in safe, readable spaces.
- First portal pair should be on the mandatory route with no hazard directly after exit.
- Optional coins demonstrate that portals can open side routes.
- Include familiar platforms, a small enemy count, and forgiving landing space.
- Target difficulty should sit near current chapter 2 or 3, not above chapter 5.

### Chapter 7 - 回环灯塔

Purpose: turn portals into route choices.

Design notes:

- Use two to three portal pairs with different colors or glyphs.
- Provide an upper collection path that favors Nini's glide and a lower speed/crystal path that favors Yuan's dash.
- Use moving platforms and breakable crystals as route modifiers, not blockers that only one character can pass.
- The main route remains straightforward; three-star collection asks for more portal planning.
- Target difficulty should sit near current chapter 4.

### Chapter 8 - 星环温室

Purpose: combine portals with existing systems.

Design notes:

- Combine portals with wind fields, moving platforms, crystals, springs, and enemies.
- Avoid dense hazard chains after portal exits; exit safety is more important than spectacle.
- Include a final multi-step route that reads like a World 2 finale but stays below hard postgame difficulty.
- Use more collectibles than current early chapters, but keep star thresholds based on collection ratio.
- Target difficulty should be roughly around current chapter 5 in total demand, with more variety rather than harsher precision.

## Star Gate Mechanic

Star gates are optional level objects. Existing levels without `portals` continue unchanged.

Portal contract:

- Portals are paired by a `pair` identifier.
- Each portal has a stable position, size, palette/glyph, and destination pair.
- Entering a portal teleports the player to the paired gate's exit point.
- The player's horizontal velocity, vertical velocity, facing, skill timers, health, ammo, and power-up timers are preserved.
- A short portal cooldown prevents immediate re-entry loops.
- Portals are player-only for v1.3.0. Enemies, projectiles, pickups, and moving platforms do not use portals.
- A portal does not activate if its exit would place the player inside a solid platform or outside the level bounds.
- A teleport should create a small visual burst and a short toast or HUD-safe feedback only when useful; it should not interrupt input.

Recommended data shape inside each level:

```js
portals: [
  {
    id: "cove-a",
    pair: "cove-b",
    x: 18 * TILE,
    y: 10 * TILE,
    w: 42,
    h: 76,
    palette: "cyan"
  },
  {
    id: "cove-b",
    pair: "cove-a",
    x: 29 * TILE,
    y: 8 * TILE,
    w: 42,
    h: 76,
    palette: "gold"
  }
]
```

The exact field names may be adjusted during implementation if they better match local code style, but the invariants above should remain fixed.

## UI And Interaction Design

Chapter select should become world-grouped without replacing the current atlas card language.

Expected chapter-select behavior:

- Display World 1 and World 2 labels within the existing `level-list` surface.
- Keep level items implemented as buttons for keyboard and screen-reader compatibility.
- Keep the featured chapter treatment for the next unlocked chapter.
- Locked World 2 chapters use the existing locked-card treatment.
- Mobile portrait should stack groups cleanly.
- Mobile landscape should preserve the current invariant: panel fits in viewport, actions remain readable, and no gameplay controls overlap.

Portal rendering should match the Aurora Inkwash identity:

- Use canvas drawing, not new image assets.
- Each portal reads as a vertical oval star gate with an inner swirl, paired color, and small glyph mark.
- Reduced FX mode should keep portals readable while reducing particle intensity.
- Portals should not be so bright that coins, hazards, or player silhouettes become hard to inspect.

## Architecture

### Gameplay Runtime

`src/game.js` remains the runtime owner.

Expected changes:

- Extend `cloneLevel` to clone optional `portals`.
- Add portal update logic after movement resolution and before completion/hazard state becomes confusing. The likely location is within `updatePlayer`, after axis movement and before goal completion checks.
- Track `player.portalCd` or an equivalent field in player state.
- Add `activePortalForPlayer` / `pairedPortal` / `portalExitRectIsSafe` helpers, or equivalent small helpers.
- Add `drawPortal` and call it from `renderWorld` before player rendering. Portals should likely render after platforms and before pickups/enemies, but final ordering should be chosen for readability.
- Add portal-specific burst particles gated by `save.settings.fx`.

No new JavaScript dependency, bundler, framework, or engine should be introduced.

### Save Data

No schema bump is required.

Reasoning:

- `save.unlocked` is already numeric and supports any `levelCount`.
- `bestTimes` and `levelStars` are already sanitized against a runtime `levelIds` allow-list.
- Adding three level IDs simply expands `levelCount` and `levelIds`.

Storage expectations:

- Existing v1.2.4 saves load normally.
- Existing players who have already completed chapter 5 should receive chapter 6 access immediately without a schema bump. The load/sanitize path can derive `unlocked >= 6` when `bestTimes.auroracitadel` exists or `levelStars.auroracitadel > 0`.
- Existing players who only unlocked chapter 5 but did not complete it remain at `unlocked: 5` and must finish chapter 5 to reach World 2.
- Schema version stays 2 because this is a normalization rule over existing fields, not a new persisted shape.

### Documentation And Release Surface

Implementation should update:

- `README.md`
- `CHANGELOG.md`
- `docs/GDD.md`
- `docs/DESIGN.md`
- `docs/MOTION.md`
- `docs/ANDROID_TESTING.md`
- `docs/plans/OPTIMIZATION_PLAN_v1.3.0.md`
- `package.json` and `package-lock.json`
- `service-worker.js` cache key
- `android/app/src/main/AndroidManifest.xml` version metadata

The PWA manifest description should change only if the visible game scope copy changes from "five chapters" to "eight chapters".

## Error Handling

Portal safety cases:

- Missing `portals` field: treat as empty array.
- Portal without a valid pair: render disabled or skip runtime activation; tests should catch this in authored content.
- Exit overlaps a solid: do not teleport.
- Exit would place player outside level bounds: do not teleport.
- Player stays inside a portal after teleport: cooldown prevents oscillation.
- Multiple overlapping portals: choose the first stable authored match or the strongest overlap, then document that choice in code/tests.
- Player dies or level restarts during cooldown: reset cooldown with the rest of player state.

## Testing Strategy

Add focused tests rather than only widening existing smoke checks.

New tests:

- `tests/portal-mechanics-v1_3_0.js`
  - Extract level data and validate portal pairs.
  - Ensure each portal pair has two valid endpoints.
  - Ensure exit rectangles are inside level bounds.
  - Ensure portal exits do not overlap solid platforms at authored positions.
  - Ensure at least one portal pair appears in each World 2 chapter.
- `tests/content-expansion-v1_3_0.js`
  - Pin package/cache/version metadata for v1.3.0.
  - Assert eight chapters exist.
  - Assert the three World 2 IDs and Chinese names are present.
  - Assert chapter-select renderer has world grouping semantics.

Update existing tests:

- `tests/run-all.js`: include new tests.
- `tests/unit/storage.test.js`: update level count and allowed IDs expectations.
- `tests/e2e/save-tampering.js`: update full-unlock expectations from 5 / 5 to 8 / 8 where appropriate.
- `tests/browser-smoke.js`: expand menu/level-select smoke to verify World 2 grouping and that chapter 6 can start when unlocked.
- `tests/pwa-assets.js` or v1.3.0 metadata test: assert the new cache key.
- `tests/android-wrapper.js` or metadata test: assert Android versionCode/versionName after bump.

Verification targets remain:

```bash
npm test
npm run build:android
```

Manual review should include:

- desktop level select grouping;
- mobile portrait level select grouping;
- mobile landscape menu and gameplay bounds;
- chapter 6 portal onboarding;
- chapter 7 optional route readability with both characters;
- chapter 8 portal plus wind/crystal combination;
- old save load behavior;
- reduced-FX portal readability;
- Android WebView touch play.

## Risks And Mitigations

Risk: `src/game.js` is already large, and adding more logic could make it harder to reason about.

Mitigation: keep portal helpers small, local, and data-driven. Do not refactor unrelated systems during the content pass.

Risk: world grouping could break the tightly guarded mobile landscape layout.

Mitigation: change only the chapter-list layout and add browser smoke coverage for grouped levels.

Risk: portals can soft-lock players if exits overlap solids or hazards.

Mitigation: add authoring tests for exit bounds and solid overlap; manually review all World 2 portal exits.

Risk: old players may expect chapter 6 to unlock if they already beat chapter 5.

Mitigation: implement the schema-compatible derivation from `bestTimes.auroracitadel` or `levelStars.auroracitadel`, and test both "chapter 5 completed" and "chapter 5 merely unlocked" old-save cases.

Risk: portals could reduce character differentiation if both characters use them identically.

Mitigation: main route stays shared, optional routes make Nini's glide and Yuan's dash feel advantageous in different places.

## Acceptance Criteria

- The game contains eight chapters total.
- Existing five chapters remain behaviorally unchanged.
- World 2 has three handcrafted chapters with at least one portal pair each.
- Chapter 6 teaches portals safely.
- Chapter 7 uses portals for route choice and optional collection paths.
- Chapter 8 combines portals with existing mechanics while staying within the content-expansion difficulty target.
- Chapter select clearly groups World 1 and World 2 without breaking keyboard, touch, or accessibility behavior.
- Save schema remains version 2 and old saves load safely.
- Old saves with recorded chapter 5 completion unlock chapter 6 automatically; old saves that only unlocked chapter 5 do not.
- `npm test` passes.
- `npm run build:android` produces `dist/NiniYuan.apk`.
- README, changelog, GDD, design, motion, Android testing notes, version metadata, and service worker cache all match the new v1.3.0 scope.

## Implementation Sequence For Later Planning

1. Add World 2 level data and optional portal data shape.
2. Add portal runtime detection, safety checks, cooldown, and drawing.
3. Add world grouping to chapter-select rendering and CSS.
4. Update storage-related expectations and content tests.
5. Update docs, release plan, versions, cache, and Android metadata.
6. Run full tests and Android build.
7. Commit implementation and release metadata in coherent git commits after review.
