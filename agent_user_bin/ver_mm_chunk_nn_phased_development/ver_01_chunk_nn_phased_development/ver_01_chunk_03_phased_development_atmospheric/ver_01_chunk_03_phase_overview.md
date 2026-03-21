# Chunk 03 Atmospheric Rendering — Development Phase Checklist

> High-level phase map based on the locked Chunk 03 Spec (WGSL Compute LUTs, Hybrid 2.5D/3D Clouds, SDF Handshake, Stochastic Weather).

---

## Phase Status
| Phase | Title | Status |
|-------|-------|--------|
| 00 | Foundation & WebGPU Compute Pipeline | ⬜ Pending |
| 01 | Parameterized Spectral Transmittance & SkyView LUTs | ⬜ Pending |
| 02 | Stochastic Weather Maps & 2.5D Global Shell | ⬜ Pending |
| 03 | Localized Voxel Proxy & SDF Handshake | ⬜ Pending |
| 04 | Scene Integration & Analytic Fog | ⬜ Pending |

---

## Phase 00 — Foundation & WebGPU Compute Pipeline
**Purpose:** Establish the core WGSL compute infrastructure and precision management required to generate hardware-accelerated 3D textures in Babylon.js.
- Set up the compute dispatch utilities and `ShaderStore` configurations.
- Create the structural classes for managing the atmospheric state and parameterized constants.
- Implement the "Floating Origin" hook interfaces for planetary distance calculations.
**Key outputs:**
- Compute pipeline utility classes and WGSL injection framework.

---

## Phase 01 — Parameterized Spectral Transmittance & SkyView LUTs
**Purpose:** Implement the exact physics (Rayleigh and Mie scattering) for the sky, mapping them to tweakable composition bounding properties instead of rigid Earth values.
- Write the WGSL compute shader for the Transmittance LUT (ozone + scattering).
- Write the WGSL compute shader for the Multiple Scattering LUT to prevent dark-smoke sunsets.
- Write the Sky-View LUT compute shader mapping latitude iteratively.
- Expose the spectral wavelength scaling parameters to the developer interface.
**Key outputs:**
- Real-time generation of physically flawless alien/realistic 2D atmosphere background textures.

---

## Phase 02 — Stochastic Weather Maps & 2.5D Global Shell
**Purpose:** Build the highly performant planet-wide raymarched cloud layer driven by dynamic procedural weather textures and compressed 3D noises.
- Generate the core Nubis 3D textures (128³ Perlin-Worley base, 32³ Worley detail, 128² Curl noise).
- Generate deterministic 2D coverage and precipitation weather maps dynamically over the landing zone.
- Implement volumetric cloud shadows (Beer shadow maps) for self-shadowing and terrain casting.
- Implement the 2.5D Nubis spherical shell raymarch shader that couples directly with the Phase 01 LUTs for time-of-day coloring (silverlining) and multiple scattering.
**Key outputs:**
- A playable, AAA-visual global cloudscape visible from space down to low atmosphere, complete with integrated rendering physics.

---

## Phase 03 — Localized Voxel Proxy & SDF Handshake
**Purpose:** Introduce the heavy 3D volumetric dogfighting space strictly around the descent path while mathematically slicing a hole in the global shell to avoid artifacts.
- Implement the bounded 3D Voxel raymarching proxy using standard 3D noise clipmaps, directly sampling the weather maps from Phase 02.
- Accelerate volumetric sampling utilizing compressed SDFs (Signed Distance Fields) or density caching to maintain frame rate.
- Update the Phase 02 Global Shell shader to evaluate an SDF cylinder around the descent path, forcing density to 0 where the Proxy sits.
**Key outputs:**
- Flawless visual continuum allowing the ship to fly "inside" complex storms without the cost of a planet-wide 3D clipmap.

---

## Phase 04 — Scene Integration & Analytic Fog
**Purpose:** Finalize the visual composite, ensuring the underlying terrain and the Minigame ship react accurately to the new lighting model since 3D Froxels are deferred.
- Inject the SkyView and Cloud passes seamlessly behind the `DescentMinigameOrchestrator` foreground objects.
- Implement the basic analytic depth-fade (fog) onto the planetary ground mesh.
**Key outputs:**
- Chunk 03 Completion: A fully integrated, physically majestic atmospheric descent sequence.
