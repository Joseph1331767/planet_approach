# Phase 06: Ambient Orbital Approach Pacing

## 1. Description
This phase reconstructs the `PreLaunchTerminal` and `MinigameOrchestrator` to accurately reflect the 4-5 minute pacing described in the design documents. The player will now witness an orbital approach toward the generated planetary surface maps (`equiUrl`) acting as a massive sphere in the distance. The camera must physically orbit this planet over the duration of the pre-launch phase, providing true 3D context before shifting to turbulence.

## 2. Deliverables
- Render an ambient 3D view of the planet during the orbital phase using the dynamically generated textures instead of naked black space.
- Overhaul `PreLaunchTerminal` into a continuous stream of command inputs extending for several minutes (configurable).
- Introduce a distinct "Launch Window" event (`T-Minus X` seconds) requiring exactly "launch" or "eng-aut" to bridge the orbital pacing to the atmospheric descent game loop.

## 3. Gap Checklist
- [x] Connect `Payload.equirectangularMaps` or `equiUrl` to a massive `MeshBuilder.CreateSphere` in the `ALIGN` state background.
- [x] Implement a passive cinematic camera orbit around the planet while in `PreLaunchTerminal`.
- [x] Modify `PreLaunchTerminal` to dynamically generate a continuous queue of random terminal commands.
- [x] Slow down the internal ALIGN timer specifically to create 4-5 minutes of ambient gameplay prior to launch.
- [x] Implement the critical "Launch Window" terminal prompt.

## 4. Acceptance Criteria
- Loading the minigame boots into an ambient orbit showcasing the generated planet in the background (or an equivalent skybox depending on projection limits).
- The player must type continuously for several minutes; an early jump to the minigame is prevented.
- The `orbitLaunchWindowPercent` (e.g. 75%) from the spec strictly dictates the boundary between calm typing and a forced auto-launch penalty.
- A missed launch window scales massive accuracy penalties into the eventual Chunk 02 descent orchestrator.
