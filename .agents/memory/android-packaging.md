---
name: Android packaging
description: User-approved Android packaging and signing continuity constraints.
---
The existing TWA is `com.okenova.app` and must remain intact with its original private signing key. The user later chose a separate Expo native app for a browser-independent interface.

**Why:** The user’s latest choice supersedes the earlier TWA-only direction, but explicitly preserves the current website and APK.

**How to apply:** Give the native app a distinct package identity; do not convert or overwrite the TWA. Clerk email/password can be native, while Google OAuth may hand off to the system browser. Replit’s Expo flow previews Android but does not publish Android APKs to Google Play; use an external Android build pipeline for distribution. Never regenerate the existing TWA release key or expose it.

Android package and namespace segments must be valid Java identifiers; avoid reserved keywords such as `native`. On memory-limited Replit builds, keep the Android SDK and Gradle cache on workspace storage, pause preview workflows during native compilation, and cap Gradle workers.

**Why:** A reserved package segment prevents Android compilation, and an unrestricted native build can exhaust the workspace's memory. A constrained release build may take many minutes while R8 is actively optimizing; CPU activity alone is not evidence that it is stuck.

**How to apply:** Validate package identifiers before prebuild. For local APK builds, use workspace-local SDK/cache directories and resource-aware Gradle settings, then verify the APK manifest and signature before delivery.

Replit's clickable asset delivery rejects files above 100 MiB.

**Why:** A universal APK can build successfully yet still be too large to attach directly, preventing delivery to the user.

**How to apply:** Check the APK size before presentation. For phone-focused test builds, ARM32 and ARM64 targets can exclude emulator-only ABIs; if a universal APK is required, choose a hosting/download route that supports larger files.
