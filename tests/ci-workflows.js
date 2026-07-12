const assert = require("node:assert/strict");
const fs = require("node:fs");

const androidWorkflow = fs.readFileSync(".github/workflows/android-build-smoke.yml", "utf8");

for (const expected of [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  "actions/setup-java@v5",
  "android-actions/setup-android@v4",
  'sdkmanager "platforms;android-36" "build-tools;36.0.0"',
  "npm run build:android",
  "test -f dist/NiniYuan.apk",
]) {
  assert.ok(androidWorkflow.includes(expected), `Android build smoke workflow missing: ${expected}`);
}

console.log("ci-workflows: android build smoke workflow passed");
