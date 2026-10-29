---
name: Replit artifact workflow ports
description: Diagnosing port conflicts when stopping and restarting artifact workflows.
---

When an artifact workflow reports `EADDRINUSE`, first verify whether an earlier server is still listening and serving requests. Do not kill a listener blindly; it may be the app's active preview or API process.

**Why:** Repeated workflow restarts left healthy Vite and API listeners active while newer starts failed on the same ports. Terminating the wrong listener can stop the working app.

**How to apply:** Before a second restart, inspect recent logs, identify the listening PID and process group, and check the endpoint's health. Stop only confirmed stale duplicates, then restart once.
