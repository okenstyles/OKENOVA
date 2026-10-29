#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$ROOT/.local/android-sdk}"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$ROOT/.local/gradle}"
: "${OKENOVA_ANDROID_KEYSTORE_PASSWORD:?Set the signing password in Replit Secrets}"

KEYSTORE="$ROOT/.local/android-signing/okenova-release.jks"
OUTPUT="$ROOT/generated-artifacts/android"
UNSIGNED="$ROOT/android/okenova/app/build/outputs/bundle/release/app-release.aab"
SIGNED="$OUTPUT/OKENOVA-1.0.1-play-upload.aab"
mkdir -p "$OUTPUT"
if [ ! -f "$KEYSTORE" ]; then
  echo "Original signing key missing. Restore it; do not create a replacement." >&2
  exit 1
fi

cd "$ROOT/android/okenova"
bash gradlew --no-daemon --max-workers=2 bundleRelease

jarsigner -keystore "$KEYSTORE" -storetype PKCS12 \
  -storepass:env OKENOVA_ANDROID_KEYSTORE_PASSWORD \
  -keypass:env OKENOVA_ANDROID_KEYSTORE_PASSWORD \
  -signedjar "$SIGNED" "$UNSIGNED" okenova
jarsigner -verify "$SIGNED" >/dev/null
echo "Verified signed Play upload bundle: generated-artifacts/android/OKENOVA-1.0.1-play-upload.aab"
