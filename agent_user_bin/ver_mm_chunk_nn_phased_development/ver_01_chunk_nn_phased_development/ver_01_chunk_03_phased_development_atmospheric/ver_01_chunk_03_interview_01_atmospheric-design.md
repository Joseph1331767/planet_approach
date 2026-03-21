# Chunk 03 Atmospheric Rendering: Design Decisions (Iter 01)

This document tracks the locked technical decisions required to finalize the `ver_01_chunk_03_design_thoughts_01_atmospheric.md` architectural path.

## 1. LUT Generation Architecture

**[A1]. Compute Shaders via Native WGSL vs Babylon Render Targets** → **(a) Native WGSL Compute Shaders**
- The game will leverage the raw performance of WebGPU APIs and `texture_3d` storage bindings to calculate the atmosphere LUTs natively, matching the AAA performance required for the EGSR 2020 technique.

---

## 2. Volumetric Cloud Architecture

**[A2]. 2.5D Spherical Shell Clouds vs True Voxel Clouds** → **(c) Hybrid: Global 2.5D Shell + Localized Voxel Landing Zone**
- Because the descent trajectory and landing spot are deterministic, we will use the highly performant 2.5D Raymarched Shell for the global planet (viewed from space and during early descent). For the final moments of the descent, we will generate a localized, bounded 3D volumetric proxy exclusively in the vehicle's path. This gives the illusion of full 3D dogfight-capable storm cells without the devastating memory cost of building them planet-wide.

---

## 3. Light Transport Reality

**[A3]. Physically Accurate Spectral Params vs Art-Directed RGB** → **(c) Parameterized Composition-Based Spectral Wavelengths**
- Instead of raw arbitrary RGB color multipliers (which easily look like plastic), we will retain the physically accurate Rayleigh $(1/\lambda^4)$ math, but expose the *composition bounds* as parameters. By skewing the math with simple parameters (e.g. telling the engine the atmosphere's base molecular wavelength is shifted), we seamlessly generate vibrant, perfectly physically-plausible alien atmospheres (like toxic green scattering) without losing the photorealistic horizon gradients.

---

## 4. Aerial Perspective & Extinction

**[A4]. Froxel Aerial Perspective Integration** → **(d) Deferred: Analytic Fog Only**
- The Descent Minigame currently transitions to the main planetary ground game before 3D topological altitude scattering becomes visible against mountains. Full 3D Froxels will be deferred out of Chunk 03 entirely to future-proof scope. We will rely on a basic transparent analytic depth-fade for the base planet mesh until the main game specifically requests the Froxel integration phase.

---

## 5. Shell to Voxel Handshake

**[B1]. 2.5D to Localized Voxel Transition** → **(b) Volume Stamping (SDF Carve-out)**
- To achieve a flawless, AAA-quality visual transition, the 3D voxel proxy will mathematically carve out a hollow cylinder inside the 2.5D global shell's noise field using a Signed Distance Field. By making the global shell evaluate an SDF cylinder around the planet-descent-path (returning 0 density inside it), the 3D proxy cleanly slots into the "hole" perfectly without ghosting or depth artifacts.

---

## 6. Procedural Storm Generation

**[B2]. Storm Cell Architecture** → **(a) Stochastic Deterministic 2D Weather Maps**
- The global planetary shell and the localized descent voxels will read from procedurally generated, stochastic 2D Weather Maps (Coverage, Precipitation, Cloud Type). Since the descent path is pre-baked and deterministic rather than a manual dogfight, we don't need script-enforced tunnels. The weather maps will procedurally assign realistic, varied weather (sometimes clear skies, sometimes intense thunderstorms) at the landing zone using standard AAA noise modifiers, providing immense replayability and realism through physically-based light transport rather than heavy geometric manipulation.

## Interview Summary — March 21, 2026

| ID | Decision | Locked Choice |
|----|----------|--------------|
| A1 | LUT Generation Architecture | (a) Native WGSL Compute Shaders |
| A2 | Volumetric Cloud Architecture | (c) Hybrid: Global 2.5D Shell + Localized Voxel Landing Zone |
| A3 | Light Transport Reality | (c) Parameterized Composition-Based Spectral Wavelengths |
| A4 | Aerial Perspective Integration | (d) Deferred: Analytic Fog Only (Scope deferred to future chunk) |
| B1 | Shell to Voxel Handshake | (b) Volume Stamping (SDF Carve-out) |
| B2 | Storm Cell Architecture | (a) Stochastic Deterministic 2D Weather Maps |

Total: 6 decisions locked.
