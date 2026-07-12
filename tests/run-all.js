const { spawnSync } = require("node:child_process");

const checks = [
  ["node", ["--check", "src/core/storage.js"]],
  ["node", ["--check", "src/core/audio.js"]],
  ["node", ["--check", "src/core/input-state.js"]],
  ["node", ["--check", "src/core/game-rules.js"]],
  ["node", ["--check", "src/core/fixed-step.js"]],
  ["node", ["--check", "src/render/hud.js"]],
  ["node", ["--check", "src/render/playfield-material.js"]],
  ["node", ["--check", "src/game.js"]],
  ["node", ["--check", "service-worker.js"]],
  ["node", ["tests/physics-balance.js"]],
  ["node", ["tests/mechanics-balance.js"]],
  ["node", ["tests/input-state.js"]],
  ["node", ["tests/game-integrity-rules.js"]],
  ["node", ["tests/frame-pacing.js"]],
  ["node", ["tests/gameplay-bugfix.js"]],
  ["node", ["tests/portal-mechanics-v1_4_0.js"]],
  ["node", ["tests/unit/storage.test.js"]],
  ["node", ["tests/character-atlas.js"]],
  ["node", ["tests/character-motion.js"]],
  ["node", ["tests/playfield-material.js"]],
  ["node", ["tests/song-atlas-ui.js"]],
  ["node", ["tests/docs-links.js"]],
  ["node", ["tests/render-touch-polish.js"]],
  ["node", ["tests/menu-polish-v1_2_3.js"]],
  ["node", ["tests/aesthetic-polish-v1_2_4.js"]],
  ["node", ["tests/content-expansion-v1_4_0.js"]],
  ["node", ["tests/phase-tide-v1_4_0.js"]],
  ["node", ["tests/readability-polish-v1_7_0.js"]],
  ["node", ["tests/experience-overhaul-v1_8_0.js"]],
  ["node", ["tests/typography-copy-v1_4_0.js"]],
  ["node", ["tests/ci-workflows.js"]],
  ["node", ["tests/canonical-url.js"]],
  ["node", ["tests/android-wrapper.js"]],
  ["node", ["tests/audio-bgm.js"]],
  ["node", ["tests/gamefeel-v1_5_0.js"]],
  ["node", ["tests/gamefeel-v1_6_1.js"]],
  ["node", ["tests/app-icon-v1_6_2.js"]],
  ["node", ["tests/pwa-assets.js"]],
  ["node", ["tests/e2e/lifecycle.js"]],
  ["node", ["tests/e2e/save-tampering.js"]],
  ["node", ["tests/e2e/pwa-registration.js"]],
  ["node", ["tests/e2e/accessibility.js"]],
  ["node", ["tests/e2e/interaction-integrity.js"]],
  ["node", ["tests/e2e/input-arbitration.js"]],
  ["node", ["tests/e2e/mobile-integrity.js"]],
  ["node", ["tests/e2e/ui-layout-integrity.js"]],
  ["node", ["tests/e2e/runtime-efficiency.js"]],
  ["node", ["tests/browser-smoke.js"]],
];

for (const [command, args] of checks) {
  const printable = [command, ...args].join(" ");
  console.log(`\n$ ${printable}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
