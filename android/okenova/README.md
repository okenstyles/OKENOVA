# OKENOVA Android

This is a Trusted Web Activity generated from Google's Bubblewrap 1.27.0
templates and maintained as a Gradle project. It opens the published OKENOVA
site, reusing its interface, Clerk browser authentication, and database.
It is not a WebView, offline client, or independent copy of customer data.

## Release identity

- Package: `com.okenova.app`
- Version: 1.0.1 (version code 2)
- Minimum Android: 7.0 (API 24), as required by Android Browser Helper 2.7.4
- Website: https://okenova-business-platform--okenstyles.replit.app/
- Fallback: browser Custom Tab if Trusted Web Activity verification is unavailable.
- Push notifications are not implemented.

## Build and sign

Requires JDK 17, Android SDK platform 36 and build-tools 36.0.0.
Run `bash android/okenova/build-release.sh` from the workspace.
The script reads `OKENOVA_ANDROID_KEYSTORE_PASSWORD` from environment Secrets,
never a source file or command-line password.

The private key lives at `.local/android-signing/okenova-release.jks`.
**Back up this encrypted keystore privately outside Replit and keep its password
in a password manager.** Ignored private files are not recoverable through Git
checkpoints or project forks. Never upload the key to the public website,
Library, or repository. Losing it prevents signing compatible APK updates.
Do not generate a replacement for updates. The build script refuses to create keys.

Output: `generated-artifacts/android/OKENOVA-1.0.1.apk` (excluded from Git).
The build script also copies the signed APK to
`artifacts/okenova/public/downloads/OKENOVA-1.0.1.apk` for the website download.
Increment versionCode and versionName in app/build.gradle for future APK releases,
update twa-manifest.json and the output filenames, and use the same signing key.
Ordinary website updates do not require a new APK.

For Play Console, run `bash android/okenova/build-play-bundle.sh`. This builds and
verifies `generated-artifacts/android/OKENOVA-1.0.1-play-upload.aab`, signed with
the same private key as the APK. When enabling Play App Signing, provide this
certificate as the upload key; Google will generate a separate app-signing key.
After Play Console provides that app-signing certificate's SHA-256 fingerprint,
add it to `.well-known/assetlinks.json` and publish the website update. Retain
the upload key for future uploads.

An AAB is only the upload package, not an approved store release. Play Console
still requires account identity/organization verification, a store listing,
privacy policy, app-content and data-safety declarations, screenshots, and any
testing requirement assigned to the account. Review the live Play Console
checklist before submission.

## Required publishing step

Publish the web app containing public/.well-known/assetlinks.json.
The production URL below must return HTTP 200 JSON, not the SPA index:

https://okenova-business-platform--okenstyles.replit.app/.well-known/assetlinks.json

The certificate fingerprint in that JSON must match `apksigner verify --print-certs`.
Until the file is published and browser verification succeeds, a toolbar can appear.
External authentication origins intentionally stay in browser-controlled UI;
do not add origins that you do not own to trusted-origin declarations.

## Distribution and testing

This APK is for direct Android installation, not a Google Play listing.
Users must approve installing from their download source. Internet access and
a compatible up-to-date browser are required. Distribution may be subject to
Android developer-verification requirements and local platform restrictions.

Before a public launch, test installation, startup, Clerk sign-in, password reset,
customer messages, Admin replies, keyboard/back navigation, and upgrades on physical
Android devices. Build/signature validation is not an on-device functionality test.
Play publishing requires a separate developer account, policies/store assets and
an Android App Bundle. If Play App Signing uses a different certificate, add its
public SHA-256 fingerprint to assetlinks.json.
