# Chunk 03 Design Thoughts: Atmospheric & Volumetric Cloud Rendering

## Context
Following the successful implementation of the infinite zoom planet core and the descent minigame dynamics, the next vertical slice focuses on ground-to-space visual realism. This Chunk aims to implement a AAA-grade, WebGPU-friendly atmospheric model that avoids visually jarring banding or LUT artifacts while supporting arbitrary camera altitudes. The goal is to move from basic lighting to a "brain-believing" physical sky that supports multiple scattering, aerial perspective, and dynamic weather-driven volumetric clouds.

## Core Feature Specifications

### 1. Atmosphere Rendering Pipeline (Hybrid Approach)
To achieve planet-scale realism while adhering to WebGPU performance constraints, we will adopt a hybrid approach leveraging both Bruneton-style and Hillaire-style techniques:
- **Transmittance LUT**: Base physically-accurate spectral rendering (including ozone) to precalculate paths from point to top-of-atmosphere.
- **Sky-View LUT**: Utilizing non-linear latitude mapping to preserve high-frequency horizon details without imposing high-dimensional update costs.
- **Aerial Perspective Froxel Volume (3D LUT)**: A view-frustum-aligned 3D texture storing luminance and transmittance, essential for achieving believable scene depth (in-scattering/extinction) on planetary geometry and incoming objects.
- **Multiple Scattering Approximation**: Prevents high-albedo clouds or thick atmospheres from rendering as dark smoke. 

### 2. Volumetric Cloudscapes (Nubis-Architecture)
Instead of relying strictly on heavy raymarching or simple skyboxes, clouds will be designed as a scalable 2.5D spherical shell utilizing weather maps, directly modeled after the *Horizon Zero Dawn* Nubis engine.
- **Dynamic Weather Maps**: Use single-channel passes (Coverage, Precipitation, Cloud Type) mapped around the planet to art-direct the cloudscape.
- **Noise Compression**: Use memory-efficient textures: 128³ 3D Texture (Perlin-Worley) for base shapes, 32³ 3D Texture for high-frequency details, and 128² 2D curl noise for turbulence.
- **Light Transport Coupling**: Cloud lighting must explicitly integrate with the atmospheric scattering Transmittance and Froxel LUTs to naturally achieve correct time-of-day coloring (e.g., sunset silverlining) and atmospheric depth.
- **Shadowing**: Implementation of Beer Shadow Maps or specific temporal jittering to allow clouds to cast shadows onto the planet surface and self-shadow realistically.

### 3. Rendering Architecture & Space Mechanics
- **Precision Management**: Large world coordinates (LWC) and a literal "Floating Origin" logic must strictly be enforced to differentiate simulation-space mechanics from render-space visuals to prevent precision jitter at scale.
- **Compute Shader Utilization**: Compute shaders (WGSL via Babylon ShaderStore) will be explicitly prioritized to calculate the LUTs into read-write storage textures.
- **Scalability Tiers**: Cloud sampling and LUT resolutions must be configurable based on distance to the surface, maintaining a scalable framework for cross-device compatibility.

## Architecture/Technical Summary
- **Render Pass Topography**:
  1. `Transmittance LUT Generation (Compute)`
  2. `Multiple Scattering LUT Generation (Compute)`
  3. `Sky-View LUT mapping (Compute)`
  4. `Aerial Perspective Froxel calculation (Compute to 3D Texture)`
  5. `Standard Scene Passes (Deferred/Forward)`
  6. `Atmosphere Compositing (Merge Scene + Froxel + SkyView)`
  7. `Nubis Volumetric Cloud Raymarch (Half-Res + Temporal Accumulation)`
- **Compute Pipeline**: Atmosphere features must be owned as an explicit system-level render target chain, separated strictly from standard Babylon Materials. Expensive LUTs (planet variables) recalculate on demand, while View-dependent LUTs rebuild per frame. 

## Locked Technical Decisions
- **WGSL Compute LUTs**: The pipeline will strictly use WebGPU Compute Shaders (WGSL) running natively via `ShaderStore` to construct all 2D and 3D scattering LUTs, maximizing generation throughput and eliminating Babylon Render Target topology hacks.
- **Hybrid Voxel/2.5D Volumetric Clouds**: We will render a highly-performant global 2.5D Nubis-style noise shell for the planetary scale. For the final moments of descent (where dogfighting/maneuverability matters), we instantiate a bounded, localized true 3D Voxel Proxy volume directly in the player's path, blending seamlessly with the global shell visually but allowing internal traversal without the memory cost of a planet-wide clipmap.
- **Parametrized Scientific Scattering**: The atmospheric core relies on true Rayleigh ($1/\lambda^4$) physics, but the wavelengths and coefficients are exposed as composition parameters, allowing real-time alien skies (e.g. toxic green) without losing photorealistic horizon lighting equations.
- **Froxels Deferred**: Due to the descent ending before mountain-level topological depth becomes a factor, the 3D Aerial Perspective Froxel grid volume is excluded from Chunk 03. A standard analytic depth-based fade will suffice for the planetary surface until the main game specifically requests the Froxel integration phase.
- **SDF Volume Stamping Handshake**: To seamlessly transition from the global 2.5D cloud shell into the specialized 3D Voxel landing zone proxy, the global shell will evaluate a Signed Distance Field (SDF) cylinder around the descent path (forcing 0 density inside it). The newly spawned 3D proxy perfectly fills this mathematical void, entirely preventing alpha-ghosting and depth clipping.
- **Stochastic 2D Weather Maps**: The clouds are driven by deterministic 2D macro-textures (Coverage, Precipitation, Type) that generate stochastic, varied weather conditions directly over the landing zone. This maintains AAA procedural infinite variety (clear skies to extreme thunderstorms) without requiring a heavy planet-wide fluid simulation or manual tunnel scripting.
