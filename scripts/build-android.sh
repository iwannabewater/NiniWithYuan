#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Android}"
BUILD_TOOLS="$ANDROID_HOME/build-tools/36.0.0"
ANDROID_JAR="$ANDROID_HOME/platforms/android-36/android.jar"
APP_DIR="$ROOT/android/app/src/main"
BUILD_DIR="$ROOT/build/android"
ASSET_DIR="$APP_DIR/assets"
OUT_DIR="$ROOT/dist"
PKG="com.iwannabewater.niniyuan"

rm -rf "$BUILD_DIR" "$ASSET_DIR" "$OUT_DIR"
mkdir -p "$BUILD_DIR/classes" "$BUILD_DIR/gen" "$ASSET_DIR/src" "$OUT_DIR"

cp "$ROOT/index.html" "$ASSET_DIR/index.html"
cp "$ROOT/styles.css" "$ASSET_DIR/styles.css"
cp "$ROOT/manifest.webmanifest" "$ASSET_DIR/manifest.webmanifest"
cp "$ROOT/src/game.js" "$ASSET_DIR/src/game.js"
cp -R "$ROOT/assets" "$ASSET_DIR/assets"

"$BUILD_TOOLS/aapt2" compile --dir "$APP_DIR/res" -o "$BUILD_DIR/resources.zip"
"$BUILD_TOOLS/aapt2" link \
  -I "$ANDROID_JAR" \
  --manifest "$APP_DIR/AndroidManifest.xml" \
  --java "$BUILD_DIR/gen" \
  --min-sdk-version 23 \
  --target-sdk-version 36 \
  -A "$ASSET_DIR" \
  -o "$BUILD_DIR/unsigned.apk" \
  "$BUILD_DIR/resources.zip"

if command -v javac >/dev/null 2>&1; then
  javac --release 17 \
    -classpath "$ANDROID_JAR" \
    -d "$BUILD_DIR/classes" \
    "$BUILD_DIR/gen/${PKG//.//}/R.java" \
    "$APP_DIR/java/${PKG//.//}/MainActivity.java"
else
  ECJ="$ROOT/tools/ecj-3.45.0.jar"
  if [ ! -f "$ECJ" ]; then
    mkdir -p "$ROOT/tools"
    curl -fsSL "https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.45.0/ecj-3.45.0.jar" -o "$ECJ"
  fi
  java -jar "$ECJ" \
    -1.8 \
    -proc:none \
    -bootclasspath "$ANDROID_JAR" \
    -classpath "$ANDROID_JAR" \
    -d "$BUILD_DIR/classes" \
    "$BUILD_DIR/gen/${PKG//.//}/R.java" \
    "$APP_DIR/java/${PKG//.//}/MainActivity.java"
fi

mkdir -p "$BUILD_DIR/dex"
mapfile -t CLASS_FILES < <(find "$BUILD_DIR/classes" -name "*.class" -type f | sort)

"$BUILD_TOOLS/d8" \
  --classpath "$ANDROID_JAR" \
  --min-api 23 \
  --output "$BUILD_DIR/dex" \
  "${CLASS_FILES[@]}"

cd "$BUILD_DIR/dex"
"$BUILD_TOOLS/aapt" add -f "$BUILD_DIR/unsigned.apk" classes.dex >/dev/null
cd "$ROOT"

"$BUILD_TOOLS/zipalign" -f 4 "$BUILD_DIR/unsigned.apk" "$BUILD_DIR/aligned.apk"

KEYSTORE="$ROOT/android/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair \
    -keystore "$KEYSTORE" \
    -storepass android \
    -keypass android \
    -alias androiddebugkey \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=iwannabewater, OU=NiniYuan, O=iwannabewater, L=Shanghai, S=Shanghai, C=CN" >/dev/null
fi

"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-key-alias androiddebugkey \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "$OUT_DIR/NiniYuan.apk" \
  "$BUILD_DIR/aligned.apk"

"$BUILD_TOOLS/apksigner" verify "$OUT_DIR/NiniYuan.apk"
echo "APK: $OUT_DIR/NiniYuan.apk"
