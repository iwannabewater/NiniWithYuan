"use strict";

// Release-metadata helpers shared by the per-version regression guards.
//
// Those guards care that the shipped metadata is *at least* the release they
// were written for, not that it is one of an enumerated list. Comparing on a
// version floor keeps them meaningful without editing every guard on every
// release, which is how the lists drifted in the first place.

function parseVersion(value) {
  const match = String(value ?? "").match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** True when `version` is greater than or equal to `floor`. */
function atLeast(version, floor) {
  const a = parseVersion(version);
  const b = parseVersion(floor);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

/** Semantic version embedded in the service-worker cache key. */
function cacheVersion(serviceWorkerSource) {
  const match = String(serviceWorkerSource).match(/CACHE = "nini-yuan-v(\d+\.\d+\.\d+)[^"]*"/);
  return match ? match[1] : null;
}

/** Full cache key, for guards that assert a release-specific suffix. */
function cacheKey(serviceWorkerSource) {
  const match = String(serviceWorkerSource).match(/CACHE = "([^"]+)"/);
  return match ? match[1] : null;
}

function androidVersionName(manifestSource) {
  const match = String(manifestSource).match(/android:versionName="(\d+\.\d+\.\d+)"/);
  return match ? match[1] : null;
}

function androidVersionCode(manifestSource) {
  const match = String(manifestSource).match(/android:versionCode="(\d+)"/);
  return match ? Number(match[1]) : null;
}

/** Version printed in the ambient strip of `index.html`. */
function documentVersion(htmlSource) {
  const match = String(htmlSource).match(/星图 · v(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

/**
 * Assert that every shipped release surface is at or above one floor.
 * `sources` takes the already-read file contents so callers keep their own I/O.
 */
function assertReleaseFloor(assert, sources, floor, minimumVersionCode) {
  const { pkg, lock, serviceWorker, html, androidManifest } = sources;
  assert.ok(atLeast(pkg.version, floor), `package.json should be ${floor} or later (got ${pkg.version})`);
  assert.ok(atLeast(lock.version, floor), `package-lock.json should be ${floor} or later (got ${lock.version})`);
  const cache = cacheVersion(serviceWorker);
  assert.ok(atLeast(cache, floor), `service worker cache should be ${floor} or later (got ${cache})`);
  const documentTag = documentVersion(html);
  assert.ok(atLeast(documentTag, floor), `index.html should print ${floor} or later (got ${documentTag})`);
  const androidName = androidVersionName(androidManifest);
  assert.ok(atLeast(androidName, floor), `Android versionName should be ${floor} or later (got ${androidName})`);
  const code = androidVersionCode(androidManifest);
  assert.ok(
    Number.isInteger(code) && code >= minimumVersionCode,
    `Android versionCode should be ${minimumVersionCode} or later (got ${code})`
  );
  assert.equal(pkg.version, lock.version, "package and lockfile versions must agree");
  assert.equal(pkg.version, cache, "the service-worker cache must carry the package version");
  assert.equal(pkg.version, androidName, "Android versionName must carry the package version");
  assert.equal(pkg.version, documentTag, "index.html must print the package version");
}

module.exports = {
  atLeast,
  parseVersion,
  cacheVersion,
  cacheKey,
  androidVersionName,
  androidVersionCode,
  documentVersion,
  assertReleaseFloor,
};
