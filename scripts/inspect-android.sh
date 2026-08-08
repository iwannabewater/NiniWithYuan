#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK_INPUT="${1:-dist/NiniYuan.apk}"
if [[ "$APK_INPUT" = /* ]]; then
  APK="$APK_INPUT"
else
  APK="$ROOT/$APK_INPUT"
fi

BUILD_TOOLS="${ANDROID_HOME:-$HOME/Android}/build-tools/36.0.0"
EXPECTED_VERSION_NAME="$(node -p "require('$ROOT/package.json').version")"
EXPECTED_VERSION_CODE="$(sed -n 's/.*android:versionCode="\([0-9][0-9]*\)".*/\1/p' "$ROOT/android/app/src/main/AndroidManifest.xml")"
EXPECTED_CERT_SHA256="${NINI_ANDROID_EXPECTED_CERT_SHA256:-}"

test -f "$APK"
test -n "$EXPECTED_VERSION_NAME"
test -n "$EXPECTED_VERSION_CODE"
test -x "$BUILD_TOOLS/aapt"
test -x "$BUILD_TOOLS/apksigner"

"$BUILD_TOOLS/aapt" dump badging "$APK" | tee "$APK.badging.txt"
grep -Fq "package: name='com.iwannabewater.niniyuan' versionCode='$EXPECTED_VERSION_CODE' versionName='$EXPECTED_VERSION_NAME'" "$APK.badging.txt"
grep -Fq "sdkVersion:'23'" "$APK.badging.txt"
grep -Fq "targetSdkVersion:'36'" "$APK.badging.txt"

"$BUILD_TOOLS/apksigner" verify --verbose --print-certs "$APK" | tee "$APK.signature.txt"
grep -Fq "Verified using v1 scheme (JAR signing): true" "$APK.signature.txt"
grep -Fq "Verified using v2 scheme (APK Signature Scheme v2): true" "$APK.signature.txt"
grep -Fq "Verified using v3 scheme (APK Signature Scheme v3): true" "$APK.signature.txt"
if [[ -n "$EXPECTED_CERT_SHA256" ]]; then
  grep -Fq "Signer #1 certificate SHA-256 digest: $EXPECTED_CERT_SHA256" "$APK.signature.txt"
fi

unzip -l "$APK" | tee "$APK.contents.txt"
for asset in \
  assets/index.html \
  assets/styles.css \
  assets/service-worker.js \
  assets/src/game.js \
  assets/src/render/character-effects.js \
  assets/src/render/creature-material.js; do
  grep -Fq "$asset" "$APK.contents.txt"
done

echo "Android inspection passed: $APK"
