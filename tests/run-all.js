"use strict";

// Full verification entry point for `npm test`.
//
// Syntax checks are discovered from the source tree so a new module can never
// ship unchecked. Tests run in layers, fastest first: pure units, headless
// simulation, authored content, interface and release contracts, then the
// real-browser suites.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return entry.isFile() && entry.name.endsWith(".js") ? [file] : [];
  });
}

const syntax = [
  ["bash", ["-n", "scripts/build-android.sh"]],
  ["bash", ["-n", "scripts/inspect-android.sh"]],
  ...walk("src").sort().map((file) => ["node", ["--check", file]]),
  ["node", ["--check", "service-worker.js"]],
];

const tests = [
  // Pure units.
  "tests/unit/fixed-step.test.js",
  "tests/unit/input-state.test.js",
  "tests/unit/rules.test.js",
  "tests/unit/storage.test.js",
  "tests/unit/progression.test.js",
  // Headless simulation.
  "tests/sim/movement.test.js",
  "tests/sim/combat.test.js",
  "tests/sim/mechanics.test.js",
  "tests/sim/warden.test.js",
  "tests/sim/boundaries.test.js",
  // Authored content.
  "tests/content/chapters.test.js",
  // Render modules.
  "tests/render/playfield.test.js",
  "tests/render/scenery.test.js",
  "tests/render/character.test.js",
  // Presentation, interface, and release contracts.
  "tests/character-atlas.js",
  "tests/character-motion.js",
  "tests/character-gilded-v2_2_0.js",
  "tests/presentation-materials.js",
  "tests/living-field-v2_3_0.js",
  "tests/starfield-cadence-v2_1_0.js",
  "tests/song-atlas-ui.js",
  "tests/docs-links.js",
  "tests/render-touch-polish.js",
  "tests/menu-polish-v1_2_3.js",
  "tests/aesthetic-polish-v1_2_4.js",
  "tests/content-expansion-v1_4_0.js",
  "tests/readability-polish-v1_7_0.js",
  "tests/experience-overhaul-v1_8_0.js",
  "tests/quiet-observatory-v1_9_0.js",
  "tests/astral-echo-v2_0_0.js",
  "tests/typography-copy-v1_4_0.js",
  "tests/ci-workflows.js",
  "tests/canonical-url.js",
  "tests/android-wrapper.js",
  "tests/audio-bgm.js",
  "tests/gamefeel-v1_5_0.js",
  "tests/gamefeel-v1_6_1.js",
  "tests/app-icon-v1_6_2.js",
  "tests/pwa-assets.js",
  // Real browser.
  "tests/e2e/lifecycle.js",
  "tests/e2e/save-tampering.js",
  "tests/e2e/pwa-registration.js",
  "tests/e2e/accessibility.js",
  "tests/e2e/interaction-integrity.js",
  "tests/e2e/input-arbitration.js",
  "tests/e2e/mobile-integrity.js",
  "tests/e2e/ui-layout-integrity.js",
  "tests/e2e/runtime-efficiency.js",
  "tests/browser-smoke.js",
].map((file) => ["node", [file]]);

for (const [command, args] of [...syntax, ...tests]) {
  const printable = [command, ...args].join(" ");
  console.log(`\n$ ${printable}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
