# v1.4.0 World 2 Completion and World 3 Phase Tide Design

Date: 2026-05-04
Repository: `iwannabewater/NiniWithYuan`
Baseline: `v1.3.1`
Status: approved for implementation planning

## Objective

Version `1.4.0` expands the game from 8 chapters to 15 chapters while preserving the existing physics, character abilities, save schema, offline runtime, Android WebView wrapper, and visual identity. The release completes World 2 with two additional star-gate chapters and opens World 3 with five chapters built around one new core mechanic: phase-tide bridges.

The design goal is a meaningful content expansion, not a systems rewrite. New work must stay data-driven, testable, and compatible with existing saves.

## Release Scope

- Keep World 1 unchanged: chapters 1-5 remain the original `第一星域 破碎星图`.
- Complete World 2: add chapters 9-10 to `第二星域 星门群岛`.
- Open World 3: add chapters 11-15 under `第三星域 星潮镜域`.
- Keep save schema version 2 and localStorage key `nini-yuan-save-v1`.
- Increase the chapter cap from 8 to 15.
- Preserve old save compatibility:
  - a save that completed chapter 5 still unlocks chapter 6;
  - a save that completed chapter 8 unlocks chapter 9.
- Update package, lockfile, service worker cache, Android `versionCode`, Android `versionName`, docs, and tests to `1.4.0`.

## Non-Goals

- No framework, bundler, or runtime dependency changes.
- No online play, cloud saves, telemetry, analytics, or account system.
- No changes to base character physics, jump, dash, glide, input bindings, or audio routing.
- No save schema bump unless implementation proves schema version 2 cannot safely represent the expansion.
- No Android native behavior change beyond version metadata and bundled assets copied by the existing build script.

## World 2 Completion

World 2 remains the star-gate mastery arc. The two new chapters use existing portal runtime behavior and should not modify `updatePortals`, `drawPortal`, cooldown handling, or portal lock semantics unless a test-proven bug is found.

### Chapter 9: 星桥潮汐

Role: connective mastery chapter.

- Combines star gates with wind fields.
- Teaches momentum preservation after portal traversal.
- Keeps hazards readable and avoids dense late-game punishment.
- Should contain at least two bidirectional portal pairs with safe exits.

### Chapter 10: 群岛星核

Role: World 2 finale.

- Combines star gates, wind, moving platforms, breakable crystals, and a longer collection route.
- Does not introduce World 3 phase objects.
- Should feel like a clear endpoint for `星门群岛`, with a broader layout than chapter 9.
- Should contain at least three bidirectional portal pairs with safe exits.

## World 3 Theme

World 3 is `第三星域 星潮镜域`. The visual language should extend the current Aurora Inkwash / Night Atlas system with colder cyan, mirror-water, and tidal pulse details. It should not replace the existing design system.

Proposed world subtitle: `星潮相位路线`.

The world should be recognizable in:

- level-select world heading;
- level card palettes;
- chapter intro copy;
- canvas phase-object rendering;
- docs and release notes.

## Phase-Tide Mechanic

The new mechanic is `相位桥`: selected objects belong to phase `a` or phase `b`. A global tide clock alternates the active phase at a predictable cadence. Active phase objects render solid and participate in gameplay. Inactive phase objects render as ghosted silhouettes or are omitted, depending on object type.

### Objects

The first implementation should support phase tagging for:

- platforms and moving platforms;
- hazards;
- coins and gems;
- optional visual markers or tide beacons.

Portals may coexist with phase objects, but portal endpoints themselves should remain always active for readability unless later testing proves phase portals are safe and valuable.

### Runtime Contract

- The fixed timestep remains unchanged.
- Phase state is computed from elapsed chapter time and level-local configuration.
- Collision considers only active phase platforms.
- Hazards damage only when their phase is active.
- Pickups can be collected only when their phase is active.
- Rendering must distinguish inactive phase geometry without confusing it with usable platforms.
- Phase switching must not strand the player inside newly active solids. If a phase platform would activate around the player, collision resolution must avoid soft-locking or the level design must keep activation zones clear.

### Data Shape

Implementation should prefer a small, explicit data model over ad hoc string parsing. A level can declare a `phaseTide` configuration and individual objects can declare `phase`.

Example shape:

```js
phaseTide: { period: 3.2, offset: 0, warning: 0.45 },
platforms: [P(12, 14, 4, 1, "phase", "a")]
```

The exact helper signature may vary, but the resulting object data must be easy to validate from tests.

## World 3 Chapters

### Chapter 11: 相位浅滩

Role: mechanic tutorial.

- Introduces phase bridges with low-risk gaps.
- Uses a slower tide period and visible safe waiting platforms.
- Avoids portal mixing.

### Chapter 12: 潮汐回廊

Role: collection and timing.

- Adds phase-tagged coins and gems.
- Encourages waiting for the alternate route instead of forcing speed.
- Keeps enemy density moderate.

### Chapter 13: 月镜断桥

Role: phase plus wind.

- Combines phase bridges with wind fields.
- Tests landing prediction without requiring perfect execution.
- Should have clean recovery platforms after high-risk jumps.

### Chapter 14: 双星钟塔

Role: World 2 and World 3 merge.

- Combines star gates with phase bridges.
- Portal exits must never land inside inactive or soon-activating phase solids.
- Use fewer enemies so the combined mechanics stay readable.

### Chapter 15: 星潮王庭

Role: final synthesis.

- Combines phase bridges, portals, wind, moving platforms, breakable crystals, hazards, and a longer collection route.
- Uses restraint: the final challenge should feel orchestrated, not overloaded.
- Must remain clearable with both Nini and Yuan.

## UI and Frontend Design

Use the existing production UI rather than adding a new screen.

- `renderLevelList` continues grouping chapters by `level.world.id`.
- The level-select screen gains a third world heading.
- Copy remains count-free in global UI surfaces: use `多世界章节` style wording, not a hard-coded chapter count in generic copy.
- Level cards should remain compact enough for 15 chapters across desktop, portrait mobile, and landscape mobile.
- The featured chapter behavior may remain `save.unlocked - 1`; if this creates awkward layout with 15 chapters, adjust CSS only within existing patterns.
- All new Chinese runtime text must be covered by local LXGW WenKai font subsets to prevent mixed-font rendering.

## Storage and Compatibility

Keep `SAVE_SCHEMA_VERSION = 2`.

Required storage changes:

- `DEFAULT_LEVEL_COUNT` becomes 15.
- sanitization clamps `unlocked` to `1..15` when no runtime level count is provided.
- existing chapter-id allow-listing continues to drop unknown score keys.
- old saves that prove completion of `ringconservatory` unlock chapter 9.

Completion proof can follow the existing v1.3.1 pattern:

- `bestTimes.ringconservatory > 0`, or
- `levelStars.ringconservatory > 0`.

## Versioning and Release Metadata

Target metadata:

- `package.json`: `1.4.0`
- `package-lock.json`: `1.4.0`
- service worker cache: `nini-yuan-v1.4.0-world-3-phase-tide`
- Android `versionCode`: `10`
- Android `versionName`: `1.4.0`

No GitHub push or release publication happens until the user has reviewed the implementation.

## Documentation Updates

Update these documents during implementation:

- `README.md`
- `CHANGELOG.md`
- `docs/GDD.md`
- `docs/DESIGN.md`
- `docs/MOTION.md`
- `docs/ANDROID_TESTING.md`
- `docs/plans/README.md`
- add a v1.4.0 plan or completion record under `docs/plans/`

The docs must explain:

- 15-chapter structure;
- World 2 completion;
- World 3 theme and phase-tide mechanic;
- save compatibility;
- manual review checklist for phase bridges and layout.

## Test Plan

Update the existing regression suite rather than bypassing it.

Required changes:

- Update content-expansion assertions from v1.3.x / 8 chapters to v1.4.0 / 15 chapters.
- Update portal-mechanics assertions so World 2 contains 5 portal-focused chapters.
- Add phase-mechanic tests covering:
  - World 3 has exactly 5 chapters;
  - each World 3 chapter declares `phaseTide`;
  - phase objects only use allowed phase values;
  - phase platform/hazard/pickup data is valid and in bounds;
  - portal exits in phase+portal chapters are safe.
- Update storage unit tests for level cap 15 and chapter 8 to 9 compatibility.
- Update save-tampering e2e from `8 / 8` to `15 / 15`.
- Update browser smoke to verify:
  - 15 level cards;
  - 3 world headings;
  - World 3 heading copy;
  - starting chapter 11 from level select works;
  - desktop and mobile layouts stay within viewport rules.
- Update typography-copy tests so all new Chinese glyphs are in both local font subsets.

Verification gate:

```bash
npm test
npm run build:android
```

If the Android SDK is unavailable locally, implementation notes must explicitly state that `npm run build:android` could not be executed and why.

## Implementation Boundaries

Expected high-risk files:

- `src/game.js`
- `src/core/storage.js`
- `src/render/hud.js` only if needed for UI density;
- `styles.css`
- tests and docs listed above.

Implementation should keep `src/game.js` changes localized:

- level data additions;
- phase helper functions;
- phase filtering in collision / pickups / hazards / rendering;
- small drawing helper for phase objects.

Do not refactor unrelated mechanics while adding phase tide.

## Acceptance Criteria

- The game has 15 playable chapters grouped into 3 worlds.
- World 2 has 5 star-gate chapters and all portal pairs are safe.
- World 3 has 5 phase-tide chapters and the mechanic is readable in gameplay.
- Both characters can clear the new chapters by design intent.
- Old v1.3.1 saves remain valid and can advance into the new content.
- New UI copy stays typography-consistent with local font subsets.
- `npm test` passes.
- Android build result is verified or a concrete environment blocker is reported.
- No generated build output, APKs, temporary mockups, or dependency directories are committed.
