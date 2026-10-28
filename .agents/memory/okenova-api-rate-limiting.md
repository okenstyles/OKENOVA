---
name: OKENOVA API rate limiting
description: Why write endpoints use authenticated user IDs as rate-limit keys.
---

Apply rate limits after authentication and key them by the verified Clerk user ID. Avoid using the raw client IP as the primary key behind Replit's proxy.

**Why:** The proxy can make unrelated clients appear to share an IP, and custom IP key generators require IPv6 normalization. User-scoped keys avoid both problems for authenticated writes.

**How to apply:** Keep auth middleware before rate-limit middleware on user write routes. If unauthenticated routes need limits, use the rate-limit library's IP normalization helper and verify proxy trust settings.
