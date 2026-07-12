# Song-atlas Experience Overhaul: v1.8.0

Version scope: `v1.7.0` to `v1.8.0`

Date: 2026-07-12

Repository: `iwannabewater/NiniWithYuan`

## Objective

Make the existing fifteen-chapter game easier to enter, clearer to control, and smoother to read without changing its route geometry or character balance. This release joins keyboard, touch, and assistive activation behind one action model; separates simulation truth from presentation sampling; gives character animation a stable state clock; and rebuilds the interface as a coherent Song-atlas instrument.

## First-principles Decisions

1. One player intent may have several physical sources. The action remains held until its final source releases.
2. Gameplay state advances on fixed steps. Rendered coordinates and animation sample that state without writing presentation data back into the player entity.
3. A character pose communicates current gameplay state. It must not delay or modify the state it represents.
4. The smallest supported screen sets the control and hierarchy budget. Larger screens may add space, never essential information.
5. Reduced motion and screen-shake controls are gameplay comfort settings, not decorative preferences hidden from the main settings surface.
6. Store images and local font subsets are release artifacts with reproducible dimensions, deterministic content, and traceable licenses.

## Primary Reference Set

| Source | Evidence used | Transfer into v1.8.0 |
| --- | --- | --- |
| [Celeste and Forgiveness, Maddy Thorson](https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html) | Small input and positioning allowances make demanding movement feel fair. | Preserve coyote time and jump buffering, and add a 120 ms intent window for a valid short Nini glide press. |
| [Dead Cells: What the F\*n?!, GDC 2019](https://media.gdcvault.com/gdc2019/presentations/Benard-Sebastian-DeepCells.pdf) | Reviews notice control response before broader systems, and player-favoring constraints can remove friction without removing challenge. | Resolve competing directions by latest intent, retain held-source fallback, and keep response timing under tested bounds. |
| [Jazz Platforming in Penny's Big Breakaway, GDC 2025](https://media.gdcvault.com/gdc2025/Slides/EstebanFajardo_JazzPlatformingInPennysBigBreakaway.pdf) | A movement model can carry a distinct rhythm while remaining learnable and legible. | Keep Nini and Yuan mechanically distinct, then attach gait, turn, land, glide, and dash presentation to their actual movement state. |
| [Ori and the Will of the Wisps developer interview](https://www.gamedeveloper.com/design/q-a-designing-the-gorgeous-metroidvania-i-ori-and-the-will-of-the-wisps-i-) | Platforming polish comes from controls, animation, sound, effects, and repeated testing working together. | Coordinate motion state, event feedback, HUD updates, camera sampling, and browser regression checks instead of retuning physics. |
| [Apple Human Interface Guidelines: Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) | Touch controls need reachable placement, large control areas, and platform-default input alternatives. | Use a wide captured direction rail, compact thumb clusters, semantic buttons, keyboard fallback, and modality-specific pause guidance. |
| [Android: Enable natural input on all form factors](https://developer.android.com/games/develop/multiplatform/enable-natural-input-on-all-form-factors) | Android games should support expected touch and non-touch input without locking behavior to a form factor. | Route keyboard, touch, pointer capture, and synthesized activation through the same action references. Keep fine-pointer portrait play available. |
| [Xbox Accessibility Guideline 107: Input](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107) | Mobile input should work with native accessibility services and alternative input devices. | Preserve semantic button activation, focus isolation, visible control state, and complete input reset at every modal or lifecycle boundary. |
| [Prince of Persia: The Lost Crown accessibility spotlight](https://www.ubisoft.com/en-gb/game/prince-of-persia/the-lost-crown/news-updates/5nGZiBSFtcEzFd93QlTotS/prince-of-persia-the-lost-crown-accessibility-spotlight) | Adjustable HUD size, separate audio levels, clear control reminders, and a screen-shake switch support difficult platforming. | Add HUD scale, touch opacity, and shake settings; keep master and BGM levels separate; show controls that match the active modality. |
| [Super Mario Bros. Wonder official site](https://supermariobroswonder.nintendo.com/en/) | Familiar platforming stays readable while a strong visual idea changes each course's character. | Keep the shared movement grammar and chapter mechanics intact while the Song-atlas material system carries the new identity. |

These references informed transfer decisions rather than direct imitation. Existing chapter geometry, physics constants, story vocabulary, and protagonist identities remain the authority for this repository.

## Implemented Scope

### Input and Lifecycle

- Derive gameplay key capture from one `ACTION_BY_KEY_CODE` map.
- Track keyboard, pointer, and synthesized activation as source references on five gameplay actions.
- Let the latest held direction win and fall back to a still-held direction on release.
- Keep aliases and multi-touch holds active until the final matching source releases.
- Allow a captured finger to slide across the left rail and change direction without lifting.
- Give keyboard and assistive activation of touch buttons a 140 ms semantic hold.
- Clear actions, edge flags, pointers, and held-key state at menu, modal, focus, blur, visibility, and orientation boundaries. Suppress a physical key that remains down until `keyup`.
- Add a 120 ms Nini glide-intent window. Cooldown begins only when glide starts.

### Simulation and Character Presentation

- Keep the fixed scheduler at 120 Hz with its eight-step frame ceiling and 80 ms lifecycle clamp.
- Store previous player and camera coordinates before each fixed step and interpolate both at render time.
- Quantize samples to device-pixel ratio instead of whole CSS pixels.
- Snap presentation on level entry, portal travel, and respawn.
- Synchronize presentation when hit-stop ends in a frame with no fixed step, preventing a one-frame rewind.
- Move animation state into `presentation.motionState` and drive entry time from the simulation clock.
- Start non-looping animation on its first frame and hold its terminal frame.
- Keep airborne turns in jump or fall, return a fast landing to run, and resolve Yuan's active dash pose from `dashDir`.

### Interface and Visual System

- Recompose the main menu around a dominant paired hero, current journey progress, and a specific continue action.
- Present character choice as a horizontal comparison with synchronized visible and ARIA selection state.
- Group all fifteen chapters into three readable world tracks with explicit lock reasons and current-chapter state.
- Rebuild HUD information as labeled instrument clusters and cache text and ARIA writes by value.
- Add a focus-trapped portrait dialog with continue and return choices. Freeze simulation while it owns the surface.
- Preserve portrait play for fine-pointer desktop viewports and provide a compact touch layout for narrow phones.
- Apply observatory-disc, lacquer, aged-gold, carved-jade, silk, and star-chart materials to Canvas scenery without changing collision geometry.
- Add persistent HUD scale, touch opacity, and screen-shake settings under save schema 3.

### Release Assets and Provenance

The capture pipeline creates nine deterministic 24-bit RGB PNG files without alpha:

- Four portrait screenshots at 1080 by 1920.
- Three landscape screenshots at 1920 by 1080.
- One desktop gameplay screenshot at 1280 by 720.
- One feature graphic at 1024 by 500.

Menu and modal staging waits for fonts, images, and finite animations. Every capture normalizes runtime copy, compares consecutive frames, and validates PNG dimensions, bit depth, color type, and screenshot aspect ratio.

The local 500 and 700 font subsets were rebuilt from [LXGW WenKai v1.522](https://github.com/lxgw/LxgwWenKai/releases/tag/v1.522) for 573 runtime code points. The tagged [SIL Open Font License 1.1](https://github.com/lxgw/LxgwWenKai/blob/v1.522/OFL.txt) is bundled at `assets/fonts/OFL.txt` and included in the offline cache. Source files, source hashes, weight mapping, and bundled hashes are recorded in `assets/fonts/NOTICE.md`.

Subset SHA-256 values:

```text
500: 25c8b344099eb47ee841d887b5f2a9a1c1d3451c440a7771792c2ee50206999b
700: 79881da3e370ed94c75219482a6c4d13d702e656c8704b36a238cfe6d73e45fc
```

Store screenshot requirements are checked against [Google Play preview asset specifications](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

## Behavior Contracts

- Jump height, gravity, dash speed and distance, glide duration, coyote time, jump buffer, ammo rules, portal cooldown, phase period, enemy collision, and chapter geometry remain unchanged.
- Input capture remains behind `play` mode and the editable or control-target gate.
- An action edge fires only when its active source count moves from zero to one. Releasing one alias cannot create a false edge or cancel another source.
- Presentation state cannot enter the player entity, save data, collision rules, or terminal-outcome resolution.
- Player and camera interpolation share one render alpha. Discontinuities snap, and hit-stop completion cannot rewind presentation.
- Reduced motion disables hit-stop and camera lead, stops decorative loops, and retains gameplay-critical route and status cues.
- The shake switch blocks all new shake and clears current shake without disabling other event feedback.
- Portrait orientation gating owns focus and freezes simulation. Both exit paths clear gameplay input.
- Save schema 3 sanitizes new settings while retaining existing progress under the original storage key.
- Store captures must be stable, correctly sized, opaque RGB PNG files generated from local assets.

## Verification Recorded During Implementation

The following focused checks passed after their affected code was in place:

```bash
node tests/input-state.js
node tests/character-motion.js
node tests/gamefeel-v1_6_1.js
node tests/experience-overhaul-v1_8_0.js
node tests/pwa-assets.js
node tests/e2e/runtime-efficiency.js
node tests/e2e/input-arbitration.js
node tests/e2e/ui-layout-integrity.js
```

The UI layout path passed five viewport and input-modality suites. The final runtime-efficiency run recorded four HUD ARIA-label mutations and 40 total observed mutations within its budget.

The versioned branch passed `npm test` on 2026-07-12. That run included all pure, metadata, accessibility, interaction, layout, efficiency, and eleven-scenario browser smoke checks. A separate `node tests/browser-smoke.js` run also passed after the final layout and modal-isolation changes.

Two consecutive `npm run capture:store` runs completed after the v1.8.0 footer and cache update. All nine SHA-256 values matched between runs, and each file passed the built-in dimension, bit-depth, RGB, alpha, and aspect-ratio checks.

```text
01-menu.png                      efae26809c2aa688ea2749ca6f6b1d1db9beee91f33cf491a03530ff2057989b
02-characters.png                b1f4b693bb7a1fdeb0ede7ba0872cf8c305fc684bd63a8bc22e2d5ac75661fdf
03-levels.png                    7f55e868488aeca14a420e27ba551daa2dc84f7bc25f781156026908b6e21663
04-rotate-prompt.png             d46393f7ea17345afd4f0f2e8d34e9e0b43c253252cd4d516a5f342ad4761796
05-menu-landscape.png            7aeefc774a43243329918c0ebce0ce3a83b3afec0178a4aa30994032adb8d386
06-gameplay-landscape.png        fe7dcd06b1a8acee4ff1fb46f9853567bd55ce2a338939e218b4dd0acb79b598
07-pause-landscape.png           89e10be756cc12a7ef8acac238ac243aa9d29ec93625407109a1ab3ab1a868fa
08-gameplay-desktop.png          60c5b7a86edaa9ae4e60bffa86a1a5ef3d044be0cf20c5b8b97e0cc85b19480e
feature-graphic-1024x500.png      7b16252cc9bfc4802b36d999b0ed070bc5c71b913515bb10afeb1344371f4cf0
```

`npm run build:android` passed with the repository-local Temurin 17 runtime and Android platform 36. APK badging reports package `com.iwannabewater.niniyuan`, `versionCode=18`, `versionName=1.8.0`, `minSdkVersion=23`, `targetSdkVersion=36`, and `compileSdkVersion=36`. Signature schemes v1, v2, and v3 verify. The APK contains the v1.8.0 footer, current cache key, runtime helpers, both font subsets, `assets/fonts/NOTICE.md`, and `assets/fonts/OFL.txt`.

Local APK SHA-256:

```text
58b0c0d88925fbad86a7d8cb8efbb83067126528ff15fd0a7aae49e73f05745c
```

The final multi-perspective Check review returned no actionable finding. The engineering Health audit scored the repository 100.0 out of 100 for the supported Codex scope, with no project-level Critical or Structural finding.

## Quality Assessment

This score covers the repository implementation and focused evidence above. It is not an APK, CI, pull-request, tag, or GitHub release certificate.

| Area | Score | Basis |
| --- | ---: | --- |
| Input and lifecycle safety | 200 / 200 | Unified action references, edge semantics, held-source fallback, transition suppression, and focused E2E coverage |
| Simulation and presentation correctness | 180 / 180 | Fixed-step contracts, shared interpolation, DPR quantization, snap paths, and hit-stop synchronization |
| Interaction and accessibility | 170 / 170 | Semantic activation, focus containment, target sizes, portrait choices, readable lock and HUD state |
| UI and material coherence | 150 / 150 | One Song-atlas hierarchy across menu, chapter, settings, HUD, touch controls, and Canvas materials |
| Runtime efficiency | 100 / 100 | Cached DOM and ARIA writes, bounded particles, stateless material helpers, and mutation budget |
| Asset reproducibility and licensing | 80 / 80 | Deterministic capture checks, exact output contracts, subset hashes, and bundled OFL text |
| Regression coverage | 70 / 70 | Pure helper tests, static boundary guards, browser modality suites, and smoke coverage |
| Maintainability and documentation | 49 / 50 | Pure helpers and ownership docs reduce risk, while `src/game.js` and `styles.css` remain deliberate large-file hotspots |
| Total | **999 / 1000** | One point remains reserved for hotspot concentration |

The one-point reserve is intentional. Canvas runtime and interface styling still concentrate in the two hotspot files named by the repository instructions. Localized edits, helper modules, and regression guards contain that risk, but they do not remove the architectural concentration.

## Release Gates

The release commit must satisfy every gate below before v1.8.0 is published:

1. `git diff --check`, `npm test`, and `node tests/browser-smoke.js` pass after all version and documentation changes.
2. Two clean `npm run capture:store` runs produce matching SHA-256 hashes for all nine images, followed by full-size visual review.
3. The final Check review reports no unresolved critical or high findings, and the engineering Health audit records no release blocker.
4. `npm run build:android` succeeds with Android platform 36 and Java 17.
5. APK badging reports `versionCode=18`, `versionName=1.8.0`, `minSdkVersion=23`, and `targetSdkVersion=36`; signature schemes v1, v2, and v3 verify.
6. The APK contains the current runtime modules, font subsets, and `assets/fonts/OFL.txt`; its SHA-256 value is recorded.
7. The feature branch is pushed, CI passes on the pull request, review is complete, and the merge lands on `main`.
8. CI, Android, and Pages checks pass on merged `main`.
9. An annotated `v1.8.0` tag is pushed, the GitHub release publishes `dist/NiniYuan.apk`, and a downloaded copy matches the local hash, badging, and signature.
10. Merged feature branches are removed locally and remotely, and remote branch, tag, release, asset, and Pages state are read back once.

## Release Boundaries

- No chapter, route geometry, character balance, save key, network service, analytics, ad system, or runtime dependency is added.
- Save schema moves from 2 to 3 only to persist HUD scale, touch opacity, and screen shake.
- Build output under `build/`, `dist/`, and `android/app/src/main/assets/` remains ignored.
- Repository history records older release decisions. Current product documentation describes v1.8.0 behavior only.
