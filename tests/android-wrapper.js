const fs = require("node:fs");

const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
const activity = fs.readFileSync("android/app/src/main/java/com/iwannabewater/niniyuan/MainActivity.java", "utf8");
const strings = fs.readFileSync("android/app/src/main/res/values/strings.xml", "utf8");
const buildScript = fs.readFileSync("scripts/build-android.sh", "utf8");

const bannedRefs = [
  "android.window.OnBackInvokedDispatcher",
  "WindowInsetsController",
  "WindowInsets.Type",
  "getOnBackInvokedDispatcher",
];

for (const ref of bannedRefs) {
  if (activity.includes(ref)) {
    throw new Error(`Android wrapper should avoid static high-API reference: ${ref}`);
  }
}

if (!manifest.includes('android:screenOrientation="sensorLandscape"')) {
  throw new Error("Android wrapper should default phones to landscape while allowing both landscape rotations");
}

if (manifest.includes('android:screenOrientation="portrait"')) {
  throw new Error("Android wrapper must not force portrait orientation");
}

if (manifest.includes("usesCleartextTraffic")) {
  throw new Error("Offline Android wrapper should not enable cleartext HTTP traffic");
}

if (!strings.includes("Nini &amp; Yuan")) {
  throw new Error("Android launcher label should be Nini & Yuan");
}

if (activity.includes("\\\\n正在启动") || activity.includes("\\\\n\" + message")) {
  throw new Error("Android loading text should use a real Java newline escape, not a visible backslash-n");
}

if (!activity.includes("Yuan loves Nini❤")) {
  throw new Error("Android loading screen should include the requested top-left tip");
}

if (!buildScript.includes('cp -R "$ROOT/src/." "$ASSET_DIR/src/"')) {
  throw new Error("Android build must copy the whole src tree, not only src/game.js");
}

for (const forbidden of [
  "setAllowFileAccessFromFileURLs(true)",
  "setAllowUniversalAccessFromFileURLs(true)",
  "setAllowContentAccess(true)",
]) {
  if (activity.includes(forbidden)) {
    throw new Error(`Android WebView should not enable unnecessary local access: ${forbidden}`);
  }
}

for (const requiredLifecycle of [
  "settings.setAllowContentAccess(false)",
  "WebSettings.MIXED_CONTENT_NEVER_ALLOW",
  "settings.setSafeBrowsingEnabled(false)",
  "protected void onPause()",
  "webView.onPause()",
  "protected void onResume()",
  "webView.onResume()",
  "protected void onDestroy()",
  "webView.destroy()",
]) {
  if (!activity.includes(requiredLifecycle)) {
    throw new Error(`Android wrapper missing lifecycle/security guard: ${requiredLifecycle}`);
  }
}

for (const iconPath of [
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml",
  "android/app/src/main/res/drawable-nodpi/ic_launcher_background.png",
  "android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png",
  "android/app/src/main/res/drawable/ic_launcher_monochrome.xml",
  "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
]) {
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Android adaptive launcher resource is missing: ${iconPath}`);
  }
}

if (fs.existsSync("android/app/src/main/res/drawable/ic_launcher.xml") || fs.existsSync("android/app/src/main/res/drawable/ic_launcher.png")) {
  throw new Error("Old single-layer launcher icon should not remain alongside adaptive icon resources");
}

if (!manifest.includes('android:icon="@mipmap/ic_launcher"') || !manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"')) {
  throw new Error("Android manifest should use adaptive launcher icon resources");
}

if (!activity.includes("hideSplash()") || !activity.includes("webView.animate().alpha(1f)")) {
  throw new Error("Android wrapper should fade from splash into the WebView");
}

for (const required of [
  "android:hardwareAccelerated=\"true\"",
  "file:///android_asset/index.html",
  "setJavaScriptEnabled(true)",
  "setDomStorageEnabled(true)",
  "GameWebViewClient",
  "GameChromeClient",
  "NiniYuan",
]) {
  if (!manifest.includes(required) && !activity.includes(required)) {
    throw new Error(`Android wrapper missing required startup guard: ${required}`);
  }
}

console.log("android-wrapper: startup compatibility checks passed");
