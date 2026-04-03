# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## vite-peer-dep-conflict — npm ci fails with ERESOLVE on vite v8 peer dep mismatch
- **Date:** 2026-04-03
- **Error patterns:** ERESOLVE, peer dep, vite@8, @vitejs/plugin-react, vite-plugin-pwa, npm ci
- **Root cause:** @vitejs/plugin-react@4.x only declares peer support for vite ^4..^7; v6.x adds ^8.0.0. vite-plugin-pwa@1.2.0 also only declares up to ^7 but is functionally compatible with vite 8 (peer dep declaration lag, not actual incompatibility per upstream issue #918).
- **Fix:** Upgrade @vitejs/plugin-react to ^6.0.0 in devDependencies. Add npm "overrides": { "vite-plugin-pwa": { "vite": "^8.0.0" } } to suppress the false peer dep conflict for vite-plugin-pwa. Regenerate lock file with npm install.
- **Files changed:** package.json, package-lock.json
---
