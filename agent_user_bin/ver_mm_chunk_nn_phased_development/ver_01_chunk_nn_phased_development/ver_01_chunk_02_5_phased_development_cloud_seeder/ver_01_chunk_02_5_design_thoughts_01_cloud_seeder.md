# Design Thoughts: Deterministic Cloud Seeder (Chunk 2.5)

## 1. Title & Overview
**Deterministic Cloud Seeder & VRAM Culling**
An architectural LOD optimization utilizing AI-generated 4K equirectangular cloud masks. Instead of relying solely on expensive and uniform 3D procedural noise for macro-level global clouds, the system uses a pre-generated deterministic upscaler (identical to the planet terrain generator) to produce 13-14 nested LOD layers of clouds. These 2D masks efficiently handle distant rendering and dynamically seed the close-range volumetric models as the player descends.

## 2. Context
Currently, the Phase 02 mathematical cloud shaders exclusively evaluate 3D procedural FBM/Worley noise. While technically rigorous, pure mathematical noise lacks organic "soul" (like massive natural hurricane structures). Computing 48-step volumetrics for clouds thousands of miles away is also computationally wasteful. Because the "Descent Minigame" executes a pre-selected interactive handshake, the exact descent column is predictable. This specific perspective advantage allows us to fake macro-scale mechanics using heavily optimized 2D layers, passing the structural data straight into the localized 3D physics engines exactly when required.

## 3. Core Feature Specifications

### 3.1 Pre-Game Loader Boundary (Data Single-Source)
- The Pre-Game Loader exclusively generates exactly **ONE 4K equirectangular black-and-white mask**.
- There is no need to actively generate 14 images or execute bulk transfers. The minigame efficiently ingests simply the single 4K master atlas natively as a standard Blob or configured URL.

### 3.2 Real-Time WebGL Cloud Upscaler (The Gamechanger)
- The Descent Minigame constructs an exclusively isolated 3D Spherical Cloud Layer floating physically above the planet.
- We will construct a dynamic Real-Time WebGL Upscaler shader (or dynamic shader material). As the camera radially descends towards the planet, the shader iteratively leverages native UV space math to sample the texture's focal region (`1/2 Width x 1/2 Height`) mapped directly towards the camera's trajectory (completely independent from the sun's trajectory).
- The GPU natively upscales that sample and recursively daisy-chains it for subsequent LOD layers, essentially evaluating flawless fractional zoom explicitly matching the underlying Planet Albedo algorithms natively mirroring identical engine physics.

### 3.3 Dynamic Handoff Thresholds
- **Deep Space**: The master 4K cloud atlas evaluates as a pure 2D physical shell. Mega-layers scaling off-camera merge into background bounds organically while smaller layers physically maintain parallax rendering permanently.
- **Atmospheric Entry**: The single active fractionally upscaled AI map dynamically translates directly into the Phase 02 Raymarcher physically substituting `weatherMapTex`. The 2D bounds instantly physically extrude into real 3D volume mapping your AI organic structures.
- **Troposphere / Surface**: The mapping physically triggers Phase 03 Volumetric local Voxels matching exact parameters.

### 3.4 VRAM Scaling & Advanced Shaders
- **Normal Generation**: We evaluates the dynamic B/W mask actively applying a real-time height/normal pass to physically generate directional Lighting shadows for BOTH Ground layers and Cloud Layers exclusively at proximal scales (bypassing the evaluation in extreme outer space where it is numerically imperceptible). 
- **Radial Culling**: Actively scales the 2x fractional recursive bounds strictly via `camera.radius` natively dynamically determining iteration limits instantly crossing atmospheric thresholds.
- **Atmospheric Blending**: Distant 2D layers globally receive a low-cost anisotropic blur approximating atmospheric Rayleigh scattering physics mimicking true FBM depth softly mapping outer rings seamlessly.

## 4. Architecture / Technical Summary
- **Evaluation Layer**: `PreLoader` (Generates 1x 4K Master Cloud Atlas).
- **Ingestion Layer**: `ConfigManager / Orchestrator` -> Ingests the single atlas natively.
- **Render Engine**:
  - `RT Cloud Upscaler Shader` -> Dynamically evaluates progressive crops directly mapped strictly to active Camera focal coordinates natively doubling scale radially.
  - `Phase 02 / Phase 03 Shaders` -> Ingests the upscaled map parameter seamlessly pushing physical storm altitudes mimicking the 2D footprint physically exactly.

## 5. Open Questions & Areas for Interview
- *Exactly what format should the pre-game loader pass the images to the minigame? (Blob arrays, File paths, direct Base64?)*
- *How do we align the exact pixel-culling threshold with the planet's coordinate engine?*
- *At what exact scale (e.g. `r = 5.6`) do we plan to trigger the un-merge from the ground layer?*
