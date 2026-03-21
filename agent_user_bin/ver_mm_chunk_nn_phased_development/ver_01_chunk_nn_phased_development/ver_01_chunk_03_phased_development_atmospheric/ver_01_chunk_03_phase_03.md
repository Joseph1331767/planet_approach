# ver_01_chunk_03_phase_03_voxel_proxy_handshake

> This phase introduces the heavy 3D volumetric dogfighting space strictly around the descent path, mathematically slicing a hole in the global shell to ensure a cinematic, flawless transition.

---

## 03.1 Purpose

While the global 2.5D shell built in Phase 02 is incredibly performant, it does not support flying *inside* massive, winding cloud canyons. To support the visceral descent minigame gameplay, we instantiate a localized, true 3D volumetric space exclusively in the player's path. To prevent these two systems from overlapping (causing alpha-ghosting and performance death), we use a Signed Distance Field (SDF) to carve a protective mathematical void out of the 2.5D shell into which the 3D proxy perfectly fits.

---

## 03.2 Scope (IN / OUT)

### IN
- Bounded 3D Voxel raymarching proxy shader.
- SDF (Signed Distance Field) geometry carving within the Phase 02 `GlobalCloudShell`.
- SDF acceleration / Cache acceleration for the voxel volume to maintain WebGPU framerates.

### OUT
- Integration with the Minigame ship orchestrator (moved to Phase 04).

---

## 03.3 Deliverables

- [ ] [D03-01] Implement `LocalizedVoxelProxy` Volume
  - [ ] Create a literal cylindrical or bounding-box mesh that follows the descent path.
  - [ ] Write the 3D raymarching pass for this mesh, sampling the exact same noise/weather textures as Phase 02 to maintain visual continuum.
- [ ] [D03-02] Implement Voxel SDF Acceleration
  - [ ] Instead of blindly stepping 128 times through empty space, implement an SDF accelerated jump-distance or deep-shadow map cache to skip empty air rapidly.
- [ ] [D03-03] Execute the SDF Handshake Carve-out
  - [ ] Modify the Phase 02 `GlobalCloudShell` to evaluate a geometric SDF function defining the `LocalizedVoxelProxy` boundaries.
  - [ ] If the 2.5D ray is *inside* the SDF, `density = 0` (hollow it out).
- [ ] [D03-04] Voxel Up-rez & Light Acceleration
  - [ ] Per the Nubis³ architecture, implement up-rezzing for dense voxel data to avoid memory bandwidth bottlenecks.
  - [ ] Implement inner-glow and dark-edge artistic approximations to simulate heavy occlusion without full path tracing.

---

## 03.4 Implementation Details

### 03.4.1 SDF Mathematical Alignment
- The coordinates passed to the SDF in the Phase 02 global shader MUST exactly match the world-space bounding box/cylinder of the `LocalizedVoxelProxy` mesh. Any discrepancy will result in a glowing seam or severe depth clipping.

### 03.4.2 Voxel Proxy Density
- The proxy shader inherits all `TransmittanceLUT` lighting data directly from Phase 01. Do not hardcode lighting values into the vortex tunnels.

---

## 03.5 Isolation Requirements

- **Inputs required**: Phase 02 weather maps and noise textures; Phase 01 lighting LUTs.
- **Outputs produced**: The functional, seamless transition between global orbit clouds and local thick volumetric storms.
- **No forward dependencies**: Yes.

---

## 03.6 Gap Checklist

- [ ] Does the `LocalizedVoxelProxy` visually match the exact weather output of the `.2.5D` shell where they touch?
- [ ] Is the SDF carving precisely removing the overlapping 2.5D geometry without over-culling?
- [ ] Does the 3D volume run at acceptable frame rates utilizing empty-space skipping?

---

## 03.7 Gate Checklist

- [ ] [Gate 1] Performance Test: The WebGPU frame time MUST NOT spike by more than an acceptable budget (e.g., 4-6ms) when the camera enters the localized voxel volume.

---

## 03.8 Verification Tests

### Unit Tests
- [ ] [Test 1: Transition Continuity] Spawn the camera at the SDF boundary. Verify that moving 1 unit inside and 1 unit outside produces essentially the same visual cloud density footprint.

---

## 03.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Transition Continuity | ⬜ Pending | |

---

## 03.10 Completion Criteria

This phase is DONE when:
- [ ] All deliverables marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] All verification tests passing
- [ ] Test results table updated with outcomes

> Proceed to Phase 04 only after all criteria are satisfied.
