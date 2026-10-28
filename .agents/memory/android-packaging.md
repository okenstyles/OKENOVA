---
name: Android packaging
description: User-approved Android packaging and signing continuity constraints.
---
The user chose to package the existing website, not rebuild a native interface.
Use Trusted Web Activity/browser authentication rather than an embedded WebView.

**Why:** Preserves the existing interface/backend and avoids embedded-browser OAuth restrictions.

**How to apply:** Keep the live website as the source of functionality. Browser chrome
on external authentication origins is intentional. Only owned, verified origins may
be trusted for toolbar-free rendering. Never regenerate a release key for updates:
the original private key must be backed up privately, since ignored files are not
protected by Git checkpoints. Do not publish private signing material as a Library asset.
