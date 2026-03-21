# ver_01_chunk_03_phase_01_parameterized_luts

> This phase implements the physically accurate Rayleigh and Mie scattering models to generate the Transmittance, Multiple Scattering, and Sky-View LUTs.

---

## 01.1 Purpose

To avoid the infamous "cheap fog" or "dark smoke" look in planetary rendering, the sky's light transport must be correctly calculated. This phase writes the AAA EGSR 2020 math into our WGSL compute pipeline, pre-calculating how much light pierces the atmosphere and bounces around. By exposing the spectral wavelengths as parameters, we gain the ability to procedurally generate alien skies (e.g., green atmospheres) that remain physically plausible.

---

## 01.2 Scope (IN / OUT)

### IN
- Parameterized Wavelength/Scattering configuration system.
- Transmittance LUT compute shader.
- Multiple Scattering LUT compute shader.
- Sky-View LUT compute shader (with non-linear horizon mapping).

### OUT
- 3D Froxel grid integration (deferred from Chunk 03 entirely).
- 2.5D Volumetric clouds (moved to Phase 02).

---

## 01.3 Deliverables

- [ ] [D01-01] Create `AtmosphereScatteringParams.ts`
  - [ ] Define the base $(1/\lambda^4)$ Rayleigh coefficients.
  - [ ] Define Mie scattering (density, asymmetry factor $g$).
  - [ ] Add Dev Panel sliders to independently shift the RGB wavelengths.
- [ ] [D01-02] Generate `TransmittanceLUT`
  - [ ] Write `transmittance.compute.wgsl` to integrate optical depth from a specific altitude to the top of the atmosphere.
  - [ ] Dispatch to a 256x64 2D `StorageTexture` on parameter change.
- [ ] [D01-03] Generate `MultipleScatteringLUT`
  - [ ] Write `multiscattering.compute.wgsl` calculating 2nd-order bounces.
  - [ ] Dispatch to a 32x32 2D `StorageTexture` on parameter change.
- [ ] [D01-04] Generate `SkyViewLUT`
  - [ ] Write `skyview.compute.wgsl` evaluating single + multiple scattering along mapped view rays.
  - [ ] Dispatch dynamically (per-frame or high-frequency) to a 192x108 2D `StorageTexture`.
- [ ] [D01-05] Implement Scalability Knobs
  - [ ] Following the EGSR 2020 protocol, expose LUT resolution multipliers as quality presets.
  - [ ] Implement distance-based sample count adjustments in the atmosphere raymarchers, reducing step counts heavily for distant queries.

---

## 01.4 Implementation Details

### 01.4.1 Shader Storage integration
- Path: `lib/atmosphere/shaders/`
- All WGSL source code should be neatly encapsulated and rely heavily on `#include` / standard functions for intersecting the spherical planet bounds to ensure DRY code across the three LUTs.

### 01.4.2 Non-Linear Mapping
- The Sky-View LUT MUST use the specific non-linear parameterization for elevation angles to guarantee high pixel density exactly at the horizon line, preventing banding artifacts when looking at sunsets.

---

## 01.5 Isolation Requirements

- **Inputs required**: Phase 00 Compute Dispatcher framework.
- **Outputs produced**: Three highly accurate 2D LUT textures containing the entire mathematical state of the planet's sky.
- **No forward dependencies**: Yes.

---

## 01.6 Gap Checklist

- [ ] Can the Transmittance LUT successfully compile and save its data without locking the main thread?
- [ ] Do the parameterized Dev Panel sliders instantly trigger a LUT recompute?
- [ ] Is the Sky-View horizon mapping resolving accurately without sudden pixelation near 0-degree elevation?

---

## 01.7 Gate Checklist

- [ ] [Gate 1] The WGSL math explicitly enforces $(1/\lambda^4)$ ratios to guarantee phys-based colors, even if $\lambda$ is randomly shifted by parameters.
- [ ] [Gate 2] The `SkyViewLUT` safely handles sun occlusion behind the planet (terminator rendering).

---

## 01.8 Verification Tests

### Debug UI Verification
- [ ] [Test 1: Output Preview] Expose debug planes in the scene that literally render the 3 2D LUTs flat onto the screen, ensuring they look like smooth, artifact-free mathematical gradients.

---

## 01.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| LUT Output Preview Validation | ⬜ Pending | |

---

## 01.10 Completion Criteria

This phase is DONE when:
- [ ] All deliverables marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] All verification tests passing
- [ ] Test results table updated with outcomes

> Proceed to Phase 02 only after all criteria are satisfied.
