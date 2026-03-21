# ver_01_chunk_03_phase_02_global_clouds

> This phase builds the highly performant planet-wide raymarched cloud layer driven by dynamic procedural weather textures and compressed 3D noises.

---

## 02.1 Purpose

To provide a AAA cinematic orbital descent, the planet requires a sweeping, majestic cloudscape that is fully visible from thousands of miles away. Raymarching true 3D voxels across an entire planet would instantly crush GPU memory and performance. By building a 2.5D spherical shell integrated with Horizon-Zero-Dawn style 3D noise patterns and Stochastic Weather Maps, we achieve extreme performance that inherits perfect lighting from the Phase 01 LUTs.

---

## 02.2 Scope (IN / OUT)

### IN
- Nubis architecture 3D noise generation (128³ Perlin-Worley, 32³ Worley, 128² Curl).
- Stochastic Deterministic 2D Weather Maps (Coverage, Type, Precipitation).
- 2.5D Spherical Shell Raymarch Shader.
- Beer Shadow Map Volumetric shadowing integration.

### OUT
- True dogfighting tunnels and hollow storm cells (moved to Localized Proxy Phase 03).

---

## 02.3 Deliverables

- [ ] [D02-01] Generate 3D Noise Textures
  - [ ] Implement compute generation or runtime loading logic for the 128³ Base (Perlin-Worley) texture.
  - [ ] Implement logic for the 32³ Detail (Worley) and the 128² Curl noise.
- [ ] [D02-02] Build `StochasticWeatherMap` Generator
  - [ ] Write a system to render a 2D map dynamically containing `R=Coverage`, `G=Precipitation`, `B=Type` mapped using standard cellular/FBM noises.
- [ ] [D02-03] Implement `GlobalCloudShell` Shader
  - [ ] Write the 2.5D raymarching pass that wraps the planet bounds.
  - [ ] Sample the weather map + base noise + detail noise to resolve cloud density.
  - [ ] Couple the cloud color specifically with the Phase 01 `TransmittanceLUT` and `MultipleScatteringLUT`.
- [ ] [D02-04] Implement `VolumetricBeerShadows`
  - [ ] Trace optical depth directly toward the sun to evaluate correct cast-shadow strengths internally.
- [ ] [D02-05] Implement Alpha-Threshold Shader Optimization
  - [ ] Per the 2015 Nubis research, implement a faster shader code path that evaluates cheaper lighting equations or exits early once the accumulated alpha crosses a near-opaque threshold (yielding ~2x specific speedups).

---

## 02.4 Implementation Details

### 02.4.1 Noise Storage
- WebGPU supports `Texture3D`. The setup should ensure that mip-mapping is correctly disabled or manually handled, as compute-generated 3D textures might require explicit mip-generation passes or nearest-filtering to maintain crisp cloud edges.

### 02.4.2 Lighting Coupling
- When evaluating the cloud density at a given sample step during raymarching, the shader MUST query the exact `TransmittanceLUT` relative to that specific altitude, rather than uniformly guessing the ambient light. This is what provides the breathtaking silverlining and deep orange sunset gradients accurately.

---

## 02.5 Isolation Requirements

- **Inputs required**: Phase 01 LUTs for lighting evaluation.
- **Outputs produced**: A renderable full-screen pass/mesh representing the planet's macro cloud coverage.
- **No forward dependencies**: Yes.

---

## 02.6 Gap Checklist

- [ ] Does the weather map generation output deterministically (i.e. if seeded, does it produce the exact same cloud layout)?
- [ ] Do the clouds correctly appear spherical at orbital distances, wrapping around the planet's curvature without distortion?
- [ ] Are sunset colors naturally injecting themselves into the dense cloud bottoms through the Multi-Scattering/Transmittance queries?

---

## 02.7 Gate Checklist

- [ ] [Gate 1] 3D Texture usage must not exceed VRAM budgets (128x128x128 single channel noise is small, but must be strictly loaded as `R8Unorm` or `RGBA8Unorm` equivalent).
- [ ] [Gate 2] The `GlobalCloudShell` shader executes purely mathematically bounds-checked against the planet simulation space.

---

## 02.8 Verification Tests

### Visual Integrity
- [ ] [Test 1: Orbital Sweep] Maneuver camera from High Orbit to Low Orbit. Ensure clouds smoothly maintain depth and self-shadowing without moire banding.
- [ ] [Test 2: Terminator Rotation] Rotate the sun to sunset angles. Confirm clouds on the dark side turn completely black/shadowed, while clouds on the terminator show deep red/silverlining.

---

## 02.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Orbital Sweep | ⬜ Pending | |
| Terminator Rotation | ⬜ Pending | |

---

## 02.10 Completion Criteria

This phase is DONE when:
- [ ] All deliverables marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] All verification tests passing
- [ ] Test results table updated with outcomes

> Proceed to Phase 03 only after all criteria are satisfied.
