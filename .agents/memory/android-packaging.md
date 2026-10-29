---
name: Android packaging
description: User-approved Android packaging and signing continuity constraints.
---
The existing TWA is `com.okenova.app` and must remain intact with its original private signing key. The user later chose a separate Expo native app for a browser-independent interface.

**Why:** The user’s latest choice supersedes the earlier TWA-only direction, but explicitly preserves the current website and APK.

**How to apply:** Give the native app a distinct package identity; do not convert or overwrite the TWA. Clerk email/password can be native, while Google OAuth may hand off to the system browser. Replit’s Expo flow previews Android but does not publish Android APKs to Google Play; use an external Android build pipeline for distribution. Never regenerate the existing TWA release key or expose it.

The user wants both Android editions to remain available: Version 1 is the website-dependent TWA; Version 2 is a separate native app with a richer native experience. Version 2’s interface is standalone, but live accounts and services still depend on the backend.

**Why:** This is a standing product distinction; replacing Version 1 with the native app would remove the lightweight website-based option.

**How to apply:** Preserve both app identities and the Version 1 download. Keep the native APK as a separate Version 2 release and do not imply that “standalone” means offline. The public website download page should list Version 1 only; do not list or link Version 2 there unless the user changes this instruction.

The native app's `scripts/build.js` prepares the hosted Expo Go bundle; it does not create an installable APK.

**Why:** The script name is ambiguous, and confusing the hosted bundle with the Gradle APK can produce a release that still depends on a browser or preview server.

**How to apply:** Use the Android Gradle `assembleRelease` task for an installable native APK, then verify its embedded package/version and signature before delivery.

Android package and namespace segments must be valid Java identifiers; avoid reserved keywords such as `native`. On memory-limited Replit builds, keep the Android SDK and Gradle cache on workspace storage, pause preview workflows during native compilation, and cap Gradle workers.

**Why:** A reserved package segment prevents Android compilation, and an unrestricted native build can exhaust the workspace's memory. A constrained release build may take many minutes while R8 is actively optimizing; CPU activity alone is not evidence that it is stuck.

**How to apply:** Validate package identifiers before prebuild. For local APK builds, use workspace-local SDK/cache directories and resource-aware Gradle settings, then verify the APK manifest and signature before delivery.

Replit's clickable asset delivery rejects files above 100 MiB.

**Why:** A universal APK can build successfully yet still be too large to attach directly, preventing delivery to the user.

**How to apply:** Check the APK size before presentation. For phone-focused test builds, ARM32 and ARM64 targets can exclude emulator-only ABIs; if a universal APK is required, choose a hosting/download route that supports larger files.
