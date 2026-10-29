---
name: Android packaging
description: User-approved Android packaging and signing continuity constraints.
---
The existing TWA is `com.okenova.app` and must remain intact with its original private signing key. The user later chose a separate Expo native app for a browser-independent interface.

**Why:** The user’s latest choice supersedes the earlier TWA-only direction, but explicitly preserves the current website and APK.

**How to apply:** Give the native app a distinct package identity; do not convert or overwrite the TWA. Clerk email/password can be native, while Google OAuth may hand off to the system browser. Replit’s Expo flow previews Android but does not publish Android APKs to Google Play; use an external Android build pipeline for distribution. Never regenerate the existing TWA release key or expose it.
