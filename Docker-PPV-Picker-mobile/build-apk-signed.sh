#!/usr/bin/env bash
# build-apk-signed.sh
set -euo pipefail

IMAGE_NAME="ppvpicker-builder"
PROJECT_DIR="$(cd "$(dirname "$0")/PPVPicker" && pwd)"
OUTPUT_DIR="$(pwd)/output"
KEYSTORE_PATH="$(pwd)/ppvpicker.keystore"

# Prompt for credentials rather than hard-coding them
read -rsp "Keystore password: " KEYSTORE_PASSWORD; echo
read -rsp "Key password:      " KEY_PASSWORD;       echo
KEY_ALIAS="ppvpicker"

mkdir -p "$OUTPUT_DIR"

docker run --rm \
    -v "$PROJECT_DIR":/app/PPVPicker \
    -v "$OUTPUT_DIR":/output \
    -v "$KEYSTORE_PATH":/secrets/ppvpicker.keystore:ro \
    -v ppvpicker-gradle-cache:/root/.gradle \
    -e KEYSTORE_PASSWORD="$KEYSTORE_PASSWORD" \
    -e KEY_PASSWORD="$KEY_PASSWORD" \
    -e KEY_ALIAS="$KEY_ALIAS" \
    "$IMAGE_NAME" \
    bash -c '
        set -e
        cd /app/PPVPicker
        npm install
        chmod +x android/gradlew
        echo "sdk.dir=$ANDROID_HOME" > android/local.properties

        # Inject signing config
        cat >> android/gradle.properties <<EOF
RELEASE_STORE_FILE=/secrets/ppvpicker.keystore
RELEASE_STORE_PASSWORD=$KEYSTORE_PASSWORD
RELEASE_KEY_ALIAS=$KEY_ALIAS
RELEASE_KEY_PASSWORD=$KEY_PASSWORD
EOF

        cd android
        ./gradlew assembleRelease --no-daemon
        cp app/build/outputs/apk/release/app-release.apk /output/ppvpicker-release.apk
        echo "Signed APK written to /output/"
    '

echo "✓  $OUTPUT_DIR/ppvpicker-release.apk"
