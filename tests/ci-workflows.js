const assert = require("node:assert/strict");
const fs = require("node:fs");

const workflows = {
  android: fs.readFileSync(".github/workflows/android-build-smoke.yml", "utf8"),
  ci: fs.readFileSync(".github/workflows/ci.yml", "utf8"),
  pages: fs.readFileSync(".github/workflows/pages.yml", "utf8"),
};
const androidWorkflow = workflows.android;
const androidInspection = fs.readFileSync("scripts/inspect-android.sh", "utf8");

const expectedPins = new Map([
  ["actions/checkout", "3d3c42e5aac5ba805825da76410c181273ba90b1"],
  ["actions/setup-node", "820762786026740c76f36085b0efc47a31fe5020"],
  ["actions/setup-java", "b6effb05e454b25005698d916606bdc6ffcbf961"],
  ["android-actions/setup-android", "40fd30fb8d7440372e1316f5d1809ec01dcd3699"],
  ["actions/attest-build-provenance", "4d101475d8b20a2381f78447822ac1eab6504dd8"],
  ["actions/upload-artifact", "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"],
  ["actions/configure-pages", "45bfe0192ca1faeb007ade9deae92b16b8254a0d"],
  ["actions/upload-pages-artifact", "fc324d3547104276b827a68afc52ff2a11cc49c9"],
  ["actions/deploy-pages", "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128"],
]);

for (const [workflowName, source] of Object.entries(workflows)) {
  const references = [...source.matchAll(/uses:\s+([^@\s]+)@([^\s#]+)/g)];
  assert.ok(references.length > 0, `${workflowName} workflow should use at least one action`);
  for (const [, action, ref] of references) {
    assert.match(ref, /^[0-9a-f]{40}$/, `${workflowName} must pin ${action} to a full commit SHA`);
    assert.equal(ref, expectedPins.get(action), `${workflowName} should use the reviewed pin for ${action}`);
  }
}

for (const expected of [
  "build-android-release:",
  "if: github.event_name == 'push'",
  "id-token: write",
  "attestations: write",
  "build-android-smoke:",
  "if: github.event_name == 'pull_request'",
  'sdkmanager "platforms;android-36" "build-tools;36.0.0"',
  "ANDROID_SIGNING_KEYSTORE_BASE64",
  "ANDROID_SIGNING_STORE_PASSWORD",
  "ANDROID_SIGNING_KEY_PASSWORD",
  "android/release.keystore",
  "NINI_ANDROID_KEYSTORE_PASSWORD",
  "NINI_ANDROID_KEY_PASSWORD",
  "npm run build:android",
  "Remove Android signing material",
  "rm -f android/release.keystore",
  "Inspect Android release candidate",
  "bash scripts/inspect-android.sh dist/NiniYuan.apk",
  "NINI_ANDROID_EXPECTED_CERT_SHA256: 23fe694d4adfb093a752c6a90f23086c6744bc520c89656079d78414979457e7",
  "sha256sum NiniYuan.apk > NiniYuan.apk.sha256",
  "sha256sum --check NiniYuan.apk.sha256",
  "subject-path: dist/NiniYuan.apk",
  "name: NiniYuan-${{ github.sha }}",
  "dist/NiniYuan.apk.sha256",
  "dist/NiniYuan.apk.badging.txt",
  "dist/NiniYuan.apk.signature.txt",
  "dist/NiniYuan.apk.contents.txt",
  "if-no-files-found: error",
  "retention-days: 14",
  "compression-level: 0",
]) {
  assert.ok(androidWorkflow.includes(expected), `Android build smoke workflow missing: ${expected}`);
}

for (const expected of [
  "EXPECTED_VERSION_NAME",
  "EXPECTED_VERSION_CODE",
  'aapt\" dump badging "$APK"',
  'apksigner\" verify --verbose --print-certs "$APK"',
  "Verified using v1 scheme (JAR signing): true",
  "Verified using v2 scheme (APK Signature Scheme v2): true",
  "Verified using v3 scheme (APK Signature Scheme v3): true",
  "Signer #1 certificate SHA-256 digest: $EXPECTED_CERT_SHA256",
  "assets/src/render/character-effects.js",
  "assets/src/render/creature-material.js",
]) {
  assert.ok(androidInspection.includes(expected), `Android inspection script missing: ${expected}`);
}

assert.match(androidWorkflow, /permissions:\s+contents: read\s+jobs:/, "workflow defaults must remain read-only");
const releaseJob = androidWorkflow.match(/  build-android-release:[\s\S]*?(?=\n  build-android-smoke:)/)?.[0] || "";
const smokeJob = androidWorkflow.match(/  build-android-smoke:[\s\S]*$/)?.[0] || "";
assert.match(releaseJob, /permissions:\s+contents: read\s+id-token: write\s+attestations: write/, "only the main release job should mint provenance");
assert.match(smokeJob, /permissions:\s+contents: read/, "pull-request smoke must declare read-only contents permission");
assert.doesNotMatch(smokeJob, /id-token: write|attestations: write|ANDROID_SIGNING_|attest-build-provenance|upload-artifact/, "pull-request smoke must not receive signing, provenance, or upload authority");

const restoreIndex = releaseJob.indexOf("Restore stable Android signing key");
const buildIndex = releaseJob.indexOf("npm run build:android");
const cleanupIndex = releaseJob.indexOf("Remove Android signing material");
const inspectIndex = releaseJob.indexOf("Inspect Android release candidate");
const checksumIndex = releaseJob.indexOf("sha256sum NiniYuan.apk > NiniYuan.apk.sha256");
const attestIndex = releaseJob.indexOf("actions/attest-build-provenance@");
const uploadIndex = releaseJob.indexOf("actions/upload-artifact@");
assert.ok(restoreIndex < buildIndex, "stable Android signing material must be restored before the release build");
assert.ok(buildIndex < cleanupIndex, "Android signing material must remain available through the build");
assert.ok(cleanupIndex < inspectIndex, "Android signing material must be removed before inspection and artifact actions");
assert.ok(buildIndex < inspectIndex, "Android inspection must run after a successful APK build");
assert.ok(inspectIndex < checksumIndex, "Android checksum must be created after package inspection");
assert.ok(checksumIndex < attestIndex, "the inspected APK must be checksummed before provenance attestation");
assert.ok(attestIndex < uploadIndex, "artifact upload must follow provenance attestation");
assert.match(
  releaseJob,
  /uses: actions\/upload-artifact@[0-9a-f]{40}[^\n]*\n[\s\S]*?path: \|\s+dist\/NiniYuan\.apk\s+dist\/NiniYuan\.apk\.sha256\s+dist\/NiniYuan\.apk\.badging\.txt\s+dist\/NiniYuan\.apk\.signature\.txt\s+dist\/NiniYuan\.apk\.contents\.txt/,
  "Android artifact upload must retain the APK and its inspection records",
);

console.log("ci-workflows: immutable action pins, stable Android signing, attestation, and artifact gates passed");
