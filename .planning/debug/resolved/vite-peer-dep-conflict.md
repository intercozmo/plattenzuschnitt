---
status: resolved
trigger: "npm ci fails because @vitejs/plugin-react@4.7.0 has peer dependency vite@^4.2.0||^5.0.0||^6.0.0||^7.0.0 but the project uses vite@^8.0.3"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED - two plugins have vite v8 peer dep conflicts
test: completed - checked npm registry for all relevant packages
expecting: n/a
next_action: fix package.json - upgrade @vitejs/plugin-react to ^6.0.0; for vite-plugin-pwa no v8-compatible release exists (latest is 1.2.0 supporting ^7.0.0 max) — must decide between downgrading vite or removing/keeping vite-plugin-pwa with --legacy-peer-deps workaround

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: npm ci should install all dependencies successfully
actual: npm ci fails with ERESOLVE error - peer dependency conflict
errors: Could not resolve dependency: peer vite@"^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0" from @vitejs/plugin-react@4.7.0 — vite@8.0.3 is installed but plugin-react only supports up to v7
reproduction: Run npm ci
started: Likely started when vite was upgraded to v8

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-04-03T00:01:00Z
  checked: package.json devDependencies
  found: "@vitejs/plugin-react": "^4.3.0", "vite": "^8.0.3", "vite-plugin-pwa": "^1.2.0", "vitest": "^4.1.2"
  implication: The ^4.3.0 range resolves to 4.7.0 which is the current latest in the 4.x line

- timestamp: 2026-04-03T00:01:00Z
  checked: npm registry - @vitejs/plugin-react versions
  found: versions go up to 6.0.1; v6.0.1 peerDeps = { vite: "^8.0.0" } (only non-optional peer dep)
  implication: upgrading @vitejs/plugin-react to ^6.0.0 directly resolves the first conflict

- timestamp: 2026-04-03T00:01:00Z
  checked: npm registry - vite-plugin-pwa versions
  found: latest is 1.2.0 with peerDep vite: "^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0" — no v8 support
  implication: vite-plugin-pwa has no published release supporting vite v8; this is a second blocking conflict

- timestamp: 2026-04-03T00:01:00Z
  checked: npm registry - vitest@4.1.2 peerDependencies
  found: vite: "^6.0.0 || ^7.0.0 || ^8.0.0"
  implication: vitest is already compatible with vite v8; not a conflict

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: Two peer dep conflicts block npm ci. (1) @vitejs/plugin-react was pinned to ^4.3.0 which resolves to 4.7.0 — that version only declares peer support for vite ^4..^7. A v6.x line now exists (6.0.1) that explicitly declares vite@^8.0.0. (2) vite-plugin-pwa@1.2.0 declares vite^3..^7 in peer deps but GitHub issue #918 confirms it works with vite 8 — the peer dep declaration just hasn't been updated. npm ci is strict about peer deps, so both cause ERESOLVE.
fix: (1) Upgrade @vitejs/plugin-react to ^6.0.0 in devDependencies. (2) Add npm "overrides" to coerce vite-plugin-pwa's peer dep to accept vite@^8.0.0 — this is safe because the plugin works fine on v8.
verification: npm ci completed with zero ERESOLVE errors. npm run build succeeded — vite 8.0.3, @vitejs/plugin-react 6.0.1, vite-plugin-pwa 1.2.0 all coexist. PWA output (sw.js, workbox, manifest) generated correctly.
files_changed: [package.json, package-lock.json]
