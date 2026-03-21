# Phase 05: Design Gap Analysis & Audit

## 1. Audit Methodology
Cross-referenced the following documents to evaluate implementation against design intent:
- `ver_01_chunk_02_design_thoughts_01_descent_minigame.md`
- `ver_01_chunk_02_interview_01_design-decisions.md`
- Core Implementations (`PreLaunchTerminal.ts`, `TurbulenceController.ts`, `MinigameOrchestrator.ts`)

## 2. Identified Gaps

### A. The Orbital Approach & Pacing (Critical Gap)
**Design Intent:** The flow should consist of > 4-5 mins of command inputs while flying towards the planet, witnessing a real-time orbit of an Earth-sized planet. The "launch window" opens after a long duration, transitioning to the turbulence reentry.
**Current Implementation:** `PreLaunchTerminal` hardcodes a 15-second window to type exactly 3 static commands (`cal-thr`, `chk-gui`, `exc-aut`), after which it instantly transitions to the reentry minigame. The `equiUrl` planet is completely omitted from the visual scene.

### B. Holographic Turbulence Mechanics (Critical Gap)
**Design Intent:** Left hand (Low Freq 3-6s), Right Hand (High Freq 1-3s). Holographic visual states telegraph the required physical action:
- White w/ Trail = Sustained Hold
- White Flashing = Rapid Tap
- Blue = Single Quick Press
There must be a defined visual hit-box for the time `t`.
**Current Implementation:** `TurbulenceController` spawns standard 2D planes that float toward the screen. There are no hit-boxes visually defined on the screen. There are no visual telegraphing states; all notes look identical. The "hold" and "rapid tap" mechanics are not implemented in the engine logic.

### C. Technical Bugs and Handoff Friction
**Issues:**
- **Config 404:** The remote `descent-config.json` is missing, throwing HTTP 404s in the console (though handled by fallback).
- **GLB Empty String:** Passing `dashboardGlbUrl: ""` into `SceneLoader` causes Babylon to crash looking for a plugin for an unknown extension.
- **Render Loop Crash:** `requestAnimationFrame` throwing `TypeError` caused by improper binding or timing of the engine disposal/start.

## 3. Corrective Action Plan

To reconcile the minigame with the true design vision, the following phases will be executed immediately:

- **Phase 06:** Orbital Approach & Prolonged Terminal Reconstruction.
- **Phase 07:** AAA Holographic Hitboxes & Polyrhythm Mechanics.
- **Phase 08:** Bug Squashing & Stability Polish.
