#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$ROOT/.local/android-sdk}"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$ROOT/.local/gradle}"
: "${OKENOVA_ANDROID_KEYSTORE_PASSWORD:?Set the APK signing password in Replit Secrets}"
KEYSTORE="$ROOT/.local/android-signing/okenova-release.jks"
OUTPUT="$ROOT/generated-artifacts/android"
mkdir -p "$(dirname "$KEYSTORE")" "$OUTPUT"
chmod 700 "$(dirname "$KEYSTORE")"
if [ ! -f "$KEYSTORE" ]; then
  echo "Signing key missing. Restore the original key; never replace it for app updates." >&2
  exit 1
fi
cd "$ROOT/android/okenova"
bash gradlew --no-daemon --max-workers=2 assembleRelease
TOOLS="$ANDROID_HOME/build-tools/36.0.0"
"$TOOLS/zipalign" -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk "$OUTPUT/okenova-aligned.apk"
"$TOOLS/apksigner" sign --ks "$KEYSTORE" --ks-key-alias okenova \
  --ks-pass env:OKENOVA_ANDROID_KEYSTORE_PASSWORD \
  --key-pass env:OKENOVA_ANDROID_KEYSTORE_PASSWORD \
  --out "$OUTPUT/OKENOVA-1.0.1.apk" "$OUTPUT/okenova-aligned.apk"
"$TOOLS/apksigner" verify --verbose --print-certs "$OUTPUT/OKENOVA-1.0.1.apk"
mkdir -p "$ROOT/artifacts/okenova/public/downloads"
cp "$OUTPUT/OKENOVA-1.0.1.apk" "$ROOT/artifacts/okenova/public/downloads/OKENOVA-1.0.1.apk"
rm "$OUTPUT/okenova-aligned.apk"
echo "Signed APK: generated-artifacts/android/OKENOVA-1.0.1.apk"
echo "Website download: artifacts/okenova/public/downloads/OKENOVA-1.0.1.apk"
