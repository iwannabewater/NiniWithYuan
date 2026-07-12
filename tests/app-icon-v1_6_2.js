const assert = require("node:assert/strict");
const fs = require("node:fs");

function pngSize(path) {
  const png = fs.readFileSync(path);
  assert.equal(png.subarray(1, 4).toString(), "PNG", `${path} must be a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const master = "assets/icons/icon-512.png";
assert.ok(fs.existsSync(master), "paired-protagonist app icon master should exist");
assert.deepEqual(pngSize(master), { width: 512, height: 512 });

for (const [path, size] of [
  ["assets/icons/icon-192.png", 192],
  ["android/app/src/main/res/drawable-nodpi/ic_launcher_background.png", 432],
  ["android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png", 432],
  ["android/app/src/main/res/mipmap-mdpi/ic_launcher.png", 48],
  ["android/app/src/main/res/mipmap-hdpi/ic_launcher.png", 72],
  ["android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", 96],
  ["android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", 144],
  ["android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", 192],
  ["android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png", 48],
  ["android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png", 72],
  ["android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png", 96],
  ["android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png", 144],
  ["android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png", 192],
]) {
  assert.deepEqual(pngSize(path), { width: size, height: size }, `${path} has the wrong release size`);
}

const manifest = fs.readFileSync("manifest.webmanifest", "utf8");
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const adaptive = [
  fs.readFileSync("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml", "utf8"),
  fs.readFileSync("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml", "utf8"),
].join("\n");

assert.ok(manifest.includes("./assets/icons/icon-192.png"));
assert.ok(manifest.includes("./assets/icons/icon-512.png"));
assert.ok(adaptive.includes("@drawable/ic_launcher_foreground"));
assert.ok(adaptive.includes("@drawable/ic_launcher_background"));
assert.ok(!adaptive.includes("monochrome"), "Android themed icon must not fall back to the retired emblem");
assert.ok(!fs.existsSync("android/app/src/main/res/drawable/ic_launcher_monochrome.xml"), "retired emblem-only launcher resource should be removed");
assert.equal(pkg.version, "1.8.0");
assert.equal(lock.version, "1.8.0");
assert.match(androidManifest, /versionCode="18"[\s\S]*versionName="1\.8\.0"/);
assert.ok(serviceWorker.includes('CACHE = "nini-yuan-v1.8.0-song-atlas-overhaul-r1"'));
assert.ok(html.includes("星图 · v1.8.0"));

console.log("app-icon-v1.8.0: paired-protagonist Web and Android launcher assets passed");
