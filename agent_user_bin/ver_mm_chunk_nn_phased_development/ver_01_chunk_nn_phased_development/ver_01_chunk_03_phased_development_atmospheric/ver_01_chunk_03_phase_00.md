# ver_01_chunk_03_phase_00_foundation_webgpu_compute

> This phase establishes the core WebGPU WGSL compute infrastructure and precision management required to generate hardware-accelerated LUT textures in Babylon.js without interrupting the render loop.

---

## 00.1 Purpose

Generating mathematically robust physical atmospheres requires computing Transmittance and scattering values across dense arrays. Doing this on the CPU or via fragment shader hacks is either too slow or topologically complex. By setting up native WGSL compute dispatchers immediately, subsequent phases can smoothly inject pure compute logic (LUT generation) directly into WebGPU storage textures, creating a robust, non-blocking atmospheric pipeline.

---

## 00.2 Scope (IN / OUT)

### IN
- Babylon.js `ComputeShader` utility wrapper class.
- Injection pipeline for loading native WGSL into Babylon's `ShaderStore`.
- Floating Origin coordinate definitions (Simulation Space vs Render Space parameters) for atmospheric radius calculations.

### OUT
- The actual atmospheric math (Rayleigh/Mie) — moved to Phase 01.

---

## 00.3 Deliverables

- [ ] [D00-01] Create `WebGPUComputeDispatcher.ts`
  - [ ] Implement wrapper to instantiate Babylon `ComputeShader`.
  - [ ] Implement robust binding group assignments for `StorageTexture` (read/write access).
- [ ] [D00-02] Create `AtmosphereParams.ts`
  - [ ] Define the planetary physical bounds struct (Planet Radius, Atmosphere Radius).
  - [ ] Implement a floating-origin offset getter that returns camera height perfectly relative to the planet's sea-level for use in shader uniforms.
- [ ] [D00-03] Create `AtmospherePipeline.ts` orchestrator class
  - [ ] Add explicit lifecycle states (`INITIALIZING`, `BUILDING_LUTS`, `READY`).

---

## 00.4 Implementation Details

### 00.4.1 WebGPUComputeDispatcher
- Path: `lib/atmosphere/core/WebGPUComputeDispatcher.ts`
- Must gracefully hook into the `Engine` to ensure it is running in WebGPU mode, throwing a clear error if falling back to WebGL (since WebGL doesn't support storage textures without extreme hacks).

### 00.4.2 AtmosphereParams
- Path: `lib/atmosphere/config/AtmosphereParams.ts`
- Must maintain a clear strict separation between Simulation Space (`Vector3` LWC) and Render Space relative floats.

---

## 00.5 Isolation Requirements

- **Inputs required**: Babylon.js engine configured for WebGPU.
- **Outputs produced**: The structural wrapper required to compile and dispatch compute shaders for Phase 01+.
- **No forward dependencies**: Yes, entirely isolated.

---

## 00.6 Gap Checklist

- [ ] Does the `WebGPUComputeDispatcher` correctly validate the WebGPU context before attempting to compile WGSL?
- [ ] Can `StorageTexture` instances be bound to the dispatcher seamlessly?
- [ ] Is the floating-origin calculation accurately isolating the camera's altitude from planet core variations?

---

## 00.7 Gate Checklist

- [ ] [Gate 1] A dummy WGSL compute shader can successfully execute via the dispatcher and write `vec4<f32>(1.0, 0.0, 0.0, 1.0)` to a texture.
- [ ] [Gate 2] The engine must not crash if WebGPU is unsupported (should fall back or emit a deliberate atmospheric disabled warning).

---

## 00.8 Verification Tests

### Unit Tests
- [ ] [Test 1: Compute Dispatcher Lifecycle] Verify the compute dispatcher binds correctly and executes the workgroups.
- [ ] [Test 2: Floating Origin] Verify that `AtmosphereParams` accurately reports altitude even when the planet mesh is physically at `(0,0,0)`.

---

## 00.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Compute Dispatcher Lifecycle | ⬜ Pending | |
| Floating Origin Math | ⬜ Pending | |

---

## 00.10 Completion Criteria

This phase is DONE when:
- [ ] All deliverables marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] All verification tests passing
- [ ] Test results table updated with outcomes

> Proceed to Phase 01 only after all criteria are satisfied.
