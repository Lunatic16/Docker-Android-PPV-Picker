#!/usr/bin/env bash
# build-apk.sh
# Builds PPVPicker as a release APK entirely inside Docker.
# Does NOT require any Android SDK, Java, or React Native on the host.
#
# Usage:
#   ./build-apk.sh           # unsigned debug-key APK (sideloadable)
#   ./build-apk.sh --signed  # signed release (prompts for keystore passwords)
set -euo pipefail

IMAGE_NAME="ppvpicker-builder"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/PPVPicker"
OUTPUT_DIR="$SCRIPT_DIR/output"

# ── Validate ──────────────────────────────────────────────────────────────────
if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "✗  Cannot find PPVPicker/ directory next to this script."
  echo "   Expected: $SOURCE_DIR"
  exit 1
fi

# ── Optional signed build ─────────────────────────────────────────────────────
SIGNED=false
KEYSTORE_PATH=""
KEYSTORE_PASSWORD=""
KEY_ALIAS=""
KEY_PASSWORD=""

if [[ "${1:-}" == "--signed" ]]; then
  SIGNED=true
  read -rp  "Path to keystore file: " KEYSTORE_PATH
  KEYSTORE_PATH="$(realpath "$KEYSTORE_PATH")"
  if [[ ! -f "$KEYSTORE_PATH" ]]; then
    echo "✗  Keystore not found: $KEYSTORE_PATH"; exit 1
  fi
  read -rsp "Keystore password: " KEYSTORE_PASSWORD; echo
  read -rp  "Key alias:         " KEY_ALIAS
  read -rsp "Key password:      " KEY_PASSWORD;       echo
fi

mkdir -p "$OUTPUT_DIR"

# ── Build Docker image ────────────────────────────────────────────────────────
echo ""
echo "▶  Building Docker image (cached after first run)…"
docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"

# ── Compose the inner build script ───────────────────────────────────────────
# This runs INSIDE the container. It:
#   1. Inits a fresh RN 0.74.3 project for its Android shell
#   2. Overlays all PPVPicker source files on top
#   3. Installs dependencies
#   4. Runs Gradle assembleRelease

read -r -d '' INNER_SCRIPT << 'INNEREOF' || true
set -e

RN_VERSION="0.74.3"
APP_NAME="PPVPicker"
APP_PACKAGE="com.ppvpicker"
WORK_DIR="/build"

echo ""
echo "── Step 1/6: Initialising React Native $RN_VERSION shell…"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# --skip-install so we control npm install ourselves after overlaying sources
npx --yes "react-native@$RN_VERSION" init "$APP_NAME" \
    --version "$RN_VERSION" \
    --package-name "$APP_PACKAGE" \
    --skip-install \
    2>&1 | grep -v "^$" | grep -v "^npm"

echo "── Step 2/6: Overlaying PPVPicker source files…"
cd "$WORK_DIR/$APP_NAME"

# Copy custom application source files over the scaffold
cp -r /source/src                         ./src
cp    /source/App.tsx                      ./App.tsx
cp    /source/babel.config.js              ./babel.config.js
cp    /source/tsconfig.json                ./tsconfig.json
cp    /source/android/app/proguard-rules.pro ./android/app/proguard-rules.pro

# Merge package.json dependencies
node - << 'NODEEOF'
const fs   = require('fs');
const base = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const over = JSON.parse(fs.readFileSync('/source/package.json', 'utf8'));

base.dependencies    = { ...base.dependencies,    ...over.dependencies    };
base.devDependencies = { ...base.devDependencies, ...over.devDependencies };

fs.writeFileSync('package.json', JSON.stringify(base, null, 2));
console.log('package.json merged.');
NODEEOF

# Inject your custom architecture, minSdkVersion, and multidex optimizations 
# directly into the fresh template's build.gradle
node - << 'NODEEOF'
const fs = require('fs');
const gradlePath = 'android/app/build.gradle';
let content = fs.readFileSync(gradlePath, 'utf8');

// 1. Force minSdkVersion to 28
content = content.replace(/minSdkVersion\s*=\s*\d+/g, 'minSdkVersion = 28');

// 2. Enable Multidex & inject the armeabi-v7a ABI filter right into the defaultConfig block
const defaultConfigSearch = /defaultConfig\s*\{/;
const injections = `defaultConfig {
        multiDexEnabled true
        ndk {
            abiFilters "armeabi-v7a"
        }`;
content = content.replace(defaultConfigSearch, injections);

// 3. Ensure multidex dependency is added at the end of the dependencies block
const dependenciesSearch = /dependencies\s*\{/;
content = content.replace(dependenciesSearch, `dependencies {\n    implementation "androidx.multidex:multidex:2.0.1"`);

fs.writeFileSync(gradlePath, content);
console.log('Template build.gradle optimized successfully.');
NODEEOF

echo "── Step 3/6: Writing SDK location…"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
echo "org.gradle.java.home=/usr/lib/jvm/java-17-openjdk-amd64" >> android/local.properties

echo "── Step 4/6: Installing JS dependencies…"
npm install --legacy-peer-deps 2>&1 | grep -v "^npm warn"

echo "── Step 5/6: Applying gradle.properties…"
cat >> android/gradle.properties << 'PROPEOF'
android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
org.gradle.daemon=false
PROPEOF

# Inject signing config if requested
if [[ "${SIGNED:-false}" == "true" ]]; then
  echo "── Injecting signing credentials…"
  cat >> android/gradle.properties << PROPEOF2
RELEASE_STORE_FILE=/secrets/keystore.jks
RELEASE_STORE_PASSWORD=${KEYSTORE_PASSWORD}
RELEASE_KEY_ALIAS=${KEY_ALIAS}
RELEASE_KEY_PASSWORD=${KEY_PASSWORD}
PROPEOF2
fi

echo "── Step 6/6: Running Gradle assembleRelease…"
cd android
chmod +x gradlew
./gradlew assembleRelease \
    --no-daemon \
    --max-workers 2 \
    -Dorg.gradle.console=plain \
    2>&1 #| grep -E "(BUILD|FAILED|error:|warning:|> Task|Exception|Caused by)" || true

# Verify build succeeded
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$APK_PATH" ]]; then
  echo ""
  echo "✗  APK not found — Gradle build failed."
  echo "   Re-run with: docker run --rm -it -v \$(pwd)/PPVPicker:/source ppvpicker-builder bash"
  echo "   Then manually: ./gradlew assembleRelease inside /build/PPVPicker/android"
  exit 1
fi

cp "$APK_PATH" /output/ppvpicker-release.apk
echo ""
echo "✓  APK written to /output/ppvpicker-release.apk"

# Print ABI contents to confirm only armeabi-v7a is present
echo ""
echo "── ABI contents (should only show armeabi-v7a):"
unzip -l /output/ppvpicker-release.apk | grep "\.so$" | awk '{print "   "$4}'
INNEREOF

# ── Docker run args ───────────────────────────────────────────────────────────
DOCKER_ARGS=(
  --rm
  -v "$SOURCE_DIR":/source:ro
  -v "$OUTPUT_DIR":/output
  -v ppvpicker-gradle-cache:/root/.gradle
  -v ppvpicker-npm-cache:/root/.npm
  -e "SIGNED=$SIGNED"
  -e "KEYSTORE_PASSWORD=$KEYSTORE_PASSWORD"
  -e "KEY_ALIAS=$KEY_ALIAS"
  -e "KEY_PASSWORD=$KEY_PASSWORD"
)

if [[ "$SIGNED" == "true" ]]; then
  DOCKER_ARGS+=(-v "$KEYSTORE_PATH":/secrets/keystore.jks:ro)
fi

echo ""
echo "▶  Running build inside container…"
echo "   Source : $SOURCE_DIR"
echo "   Output : $OUTPUT_DIR"
echo ""

docker run "${DOCKER_ARGS[@]}" "$IMAGE_NAME" bash -c "$INNER_SCRIPT"

echo ""
echo "════════════════════════════════════════════"
echo "  ✓  Build complete!"
echo "  APK → $OUTPUT_DIR/ppvpicker-release.apk"
echo "════════════════════════════════════════════"
echo ""
echo "Install on connected device:"
echo "  adb install $OUTPUT_DIR/ppvpicker-release.apk"
