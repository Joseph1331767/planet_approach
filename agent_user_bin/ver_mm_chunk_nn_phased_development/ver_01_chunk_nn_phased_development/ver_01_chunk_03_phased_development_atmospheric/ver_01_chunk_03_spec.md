# ver_01_chunk_03 — Atmospheric Rendering Spec

> **Goal**: Implement a AAA-grade, WebGPU-friendly atmospheric model including Transmittance, SkyView, multiple scattering, and scalable procedural 2.5D Volumetric Clouds that handshake seamlessly with a localized 3D proxy.

---

## Locked Design Decisions

### Section A: Rendering Pipeline & Architecture

**A1. Compute Shaders via Native WGSL vs Babylon Render Targets** → **(a) Native WGSL Compute Shaders**
- The game will leverage the raw performance of WebGPU APIs and `texture_3d` storage bindings to calculate the atmosphere LUTs natively, matching the AAA performance required for the EGSR 2020 technique.

**A2. Volumetric Cloud Architecture** → **(c) Hybrid: Global 2.5D Shell + Localized Voxel Landing Zone**
- Because the descent trajectory and landing spot are deterministic, we will use the highly performant 2.5D Raymarched Shell for the global planet. For the final moments of the descent, we will generate a localized, bounded 3D volumetric proxy exclusively in the vehicle's path, bypassing the immense memory cost of a planet-wide clipmap.

**A3. Physically Accurate Spectral Params vs Art-Directed RGB** → **(c) Parameterized Composition-Based Spectral Wavelengths**
- Instead of raw arbitrary RGB color multipliers, we will retain the physically accurate Rayleigh $(1/\lambda^4)$ math, but expose the *composition bounds* as parameters to easily generate vibrant, physically-plausible alien atmospheres (like toxic green scattering) without losing photorealistic gradients.

**A4. Froxel Aerial Perspective Integration** → **(d) Deferred: Analytic Fog Only**
- The Descent Minigame currently transitions to the main planetary ground game before 3D topological altitude scattering becomes visible against mountains. Full 3D Froxels will be deferred out of Chunk 03 entirely. We will rely on a basic transparent analytic depth-fade for the base planet mesh.

---

### Section B: Volume Handshake & Weather Simulation

**B1. 2.5D to Localized Voxel Transition** → **(b) Volume Stamping (SDF Carve-out)**
- To achieve a flawless transition, the 3D voxel proxy will mathematically carve out a hollow cylinder inside the 2.5D global shell's noise field using an SDF evaluated around the planet-descent-path. The 3D proxy perfectly fills this hole, avoiding ghosting.

**B2. Storm Cell Architecture** → **(a) Stochastic Deterministic 2D Weather Maps**
- The global planetary shell and the localized descent voxels will read from procedurally generated, stochastic 2D Weather Maps (Coverage, Precipitation, Cloud Type). The weather maps will procedurally assign realistic, varied weather at the landing zone using standard AAA noise modifiers, providing replayability without manual scripting.

---

## Unfinished Business Coverage

*No unfinished business items are currently tracked for this chunk.*

---

## Ready for `/create-phase-plan`

All 6 decisions locked. Proceed to phase planning when ready.
