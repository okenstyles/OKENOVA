---
name: Expo release-age limits
description: Expo package patch alignment can conflict with the workspace package firewall's minimum release age.
---
When an Expo SDK has just released, `expo install --check` may request module patch versions that the workspace package firewall blocks for being too new. Prefer an earlier mature patch within the same SDK line when it satisfies the package's peer range and verifies with TypeScript and native bundling; do not bypass the firewall's release-age policy.

**Why:** On 2026-10-29, the Expo SDK 58 CLI requested a newly published AuthSession patch, while the package firewall rejected it. An earlier SDK 58 patch installed and the Android bundle succeeded.

**How to apply:** Check the exact SDK and peer ranges first, then run typecheck and an Android export after selecting a mature compatible patch. Revisit patch alignment once the firewall permits the recommended release.
