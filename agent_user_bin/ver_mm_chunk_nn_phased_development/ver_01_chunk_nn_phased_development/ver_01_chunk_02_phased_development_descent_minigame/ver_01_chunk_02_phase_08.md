# Phase 08: Bug Squashing & Minigame Stability

## 1. Description
This phase isolates and permanently resolves the runtime stability errors observed in the console during testing of the `MinigameOrchestrator` inside the `app/page.tsx` test harness.

## 2. Deliverables
- Fix the `ConfigManager` JSON 404 error cleanly (graceful fallback without console spam).
- Suppress the `dashboardGlbUrl` crash by short-circuiting MeshImport when the path is not provided.
- Resolve the `requestAnimationFrame` crash occurring on React hot-reloads or instance teardowns.

## 3. Gap Checklist
- [x] Implement grace fallback if `payload.assets.dashboardGlbUrl` is empty.
- [x] Remove `ConfigManager` HTTP fetch or quietly default it.
- [x] Safely tear down `Engine.runRenderLoop` during minigame `end()` to prevent `requestAnimationFrame` TypeErrors.e `Engine.dispose()` is called.

## 4. Acceptance Criteria
- Triggering the "Minigame" test from the playground results in zero console errors.
- Unmounting the tester correctly cleans up the Babylon engine without `requestAnimationFrame` TypeErrors.
