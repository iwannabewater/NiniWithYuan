const { spawnSync } = require("node:child_process");

const checks = [
  ["node", ["--check", "src/core/storage.js"]],
  ["node", ["--check", "src/core/audio.js"]],
  ["node", ["--check", "src/render/hud.js"]],
  ["node", ["--check", "src/game.js"]],
  ["node", ["--check", "service-worker.js"]],
  ["node", ["tests/physics-balance.js"]],
  ["node", ["tests/mechanics-balance.js"]],
  ["node", ["tests/gameplay-bugfix.js"]],
  ["node", ["tests/portal-mechanics-v1_3_0.js"]],
  ["node", ["tests/unit/storage.test.js"]],
  ["node", ["tests/character-atlas.js"]],
  ["node", ["tests/docs-links.js"]],
  ["node", ["tests/render-touch-polish.js"]],
  ["node", ["tests/menu-polish-v1_2_3.js"]],
  ["node", ["tests/aesthetic-polish-v1_2_4.js"]],
  ["node", ["tests/content-expansion-v1_3_0.js"]],
  ["node", ["tests/ci-workflows.js"]],
  ["node", ["tests/android-wrapper.js"]],
  ["node", ["tests/audio-bgm.js"]],
  ["node", ["tests/pwa-assets.js"]],
  ["node", ["tests/e2e/lifecycle.js"]],
  ["node", ["tests/e2e/save-tampering.js"]],
  ["node", ["tests/e2e/pwa-registration.js"]],
  ["node", ["tests/e2e/accessibility.js"]],
  ["node", ["tests/browser-smoke.js"]],
];

for (const [command, args] of checks) {
  const printable = [command, ...args].join(" ");
  console.log(`\n$ ${printable}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
