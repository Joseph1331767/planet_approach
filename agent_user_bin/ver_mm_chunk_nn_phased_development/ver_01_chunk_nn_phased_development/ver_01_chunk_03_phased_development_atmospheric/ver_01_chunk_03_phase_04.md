# ver_01_chunk_03_phase_04_scene_integration

> This phase finalizes the visual composite, bringing the completed sky, multiple-scattering atmosphere, and dynamic clouds into the primary Babylon.js scene, ensuring standard scene objects react to the new lighting and fog model.

---

## 04.1 Purpose

A physically simulated sky is useless if the game's terrain and spaceship models look like they are plastic toys rendered on top of a green screen. To fuse the atmosphere with the `DescentMinigameOrchestrator` and planetary terrain, we must integrate the SkyView and Cloud passes into the standard rendering pipeline, while applying an analytical depth-fade to ground objects to simulate aerial perspective (deferring the heavy 3D Froxel approach to a future chunk).

---

## 04.2 Scope (IN / OUT)

### IN
- Atmosphere composition pass (merging SkyView and Clouds as a background/post-process element).
- Analytical depth-fade (Aerial Perspective Fog) injection into the terrain schema.
- Integration with `DescentMinigameOrchestrator`.

### OUT
- Full 3D Aerial Perspective Froxel grid volume (explicitly deferred from Chunk 03).

---

## 04.3 Deliverables

- [ ] [D04-01] Composite Sky & Scene
  - [ ] Implement a final composition pass (or hook directly into Babylon's clear color / skybox equivalent) to render the `SkyViewLUT` safely behind all opaque geometry.
  - [ ] Render the Phase 02 and 03 Volumetric Cloud layers correctly interleaved with scene depth to allow mountains to poke through the clouds.
- [ ] [D04-02] Implement Analytic Aerial Perspective
  - [ ] Write a custom fog vertex/fragment function or utilize Babylon's custom material hooks.
  - [ ] Query the `TransmittanceLUT` based on distance-to-camera and altitude to accurately tint the terrain mesh, simulating atmospheric extinction.
- [ ] [D04-03] Orchestrator Verification
  - [ ] Boot the Descent Minigame sequence inside the new atmosphere.
  - [ ] Ensure the UI and HUD elements (the letters/catchers) are unaffected by the atmospheric fog.

---

## 04.4 Implementation Details

### 04.4.1 Scene Depth
- The `SkyViewLUT` behaves as the ultimate background. However, the Volumetric Clouds must respect depth. Babylon's WebGPU depth buffer needs to be accessible as a texture so the cloud raymarcher can terminate early when it hits the terrain mesh.

### 04.4.2 UI Pass Isolation
- Verify that `renderingGroupId = 2` continues to completely bypass the compositing pipeline so UI elements do not get fogged out.

---

## 04.5 Isolation Requirements

- **Inputs required**: Phase 01 LUTs, Phase 02/03 Clouds, existing Descent Minigame.
- **Outputs produced**: The final playable Chunk 03 Vertical Slice.
- **No forward dependencies**: Yes.

---

## 04.6 Gap Checklist

- [ ] Does the `SkyViewLUT` correctly render behind the spaceship and the planet?
- [ ] Does the cloud raymarcher correctly stop when intersecting a mountain, ensuring clouds don't render "through" solid geometry?
- [ ] Does the analytic fog correctly tint into the ambient color of the `SkyViewLUT` at distance, rather than just rendering stark white or gray?

---

## 04.7 Gate Checklist

- [ ] [Gate 1] Depth Buffer Dependency: The system must successfully read the hardware depth buffer during the cloud pass without causing a GPU stall.

---

## 04.8 Verification Tests

### Integration Tests
- [ ] [Test 1: Full Playthrough] Run the entire Descent Minigame sequence from initial click down through orbit, into the clouds, and landing. Ensure no visual pops or depth sorting failures occur.

---

## 04.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Full Playthrough | ⬜ Pending | |

---

## 04.10 Completion Criteria

This phase is DONE when:
- [ ] All deliverables marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] All verification tests passing
- [ ] Test results table updated with outcomes

> Proceed to Phase 04 Completion (Chunk 03 End) only after all criteria are satisfied.
