# ver_01_chunk_02_5 — Deterministic Cloud Seeder Spec

> **Goal**: Replace expensive multi-layered global FBM noise bounds natively with a single 4K AI-generated Cloud Atlas, fractionally upscaled in real-time within WebGL, governed securely across isolated generation and consumption boundaries.

---

## Locked Design Decisions

### Section A: Architecture & Structural Separation

**A1. Data Transfer Format (Pre-Loader to Minigame)** → **(a) Single 4K Image / Blob URL**
- **Rationale**: Exclusively transmitting a singular 4K equirectangular image via a Blob URL physically bypasses intense V8 Javascript garbage collection completely, injecting data directly from the Generator memory into the Minigame pipeline flawlessly.
- **Strict Boundary**: The actual organic creation of this 4K weather map belongs entirely inside the Pre-Game Loader / Planet Generator scripts locally. The Minigame acts 100% strictly as an isolated consumer, natively polling the `ConfigManager` for the final URL and completely lacking generation dependencies.

**A2. Real-Time WebGL Fractional Upscaler** → **(X) Dynamic GPU Texture Shader**
- **Rationale**: Instead of uploading 14 separate arrays to VRAM, the Minigame leverages a dynamic WebGL shader material natively. By sampling a specific `1/2 Width x 1/2 Height` UV subset positioned relative to the camera's trajectory focal point locally, the GPU physically upscales and recursively loads nested LOD tiers at absolutely zero performance cost.

---

### Section B: LOD Tracking & Layer Scoping

**B1. Global Ground Un-Merge Strategy** → **(X) Isolated Dynamic Spheres**
- **Rationale**: Distant unobservable macro-layers dynamically merge down to save geometric bounds naturally out of frame. However, the focal cloud tiers structurally preserve pure isolation on alpha-spheres physically above the planet indefinitely, ensuring real-time shadows and parallax scaling persist flawlessly across all active zoom limits.

**B2. Dynamic Frustum & Sub-Pixel Culling** → **(a) Strict Radial Altitude Equations**
- **Rationale**: Since the player drops straight toward the mesh strictly mathematically evaluated over local `camera.radius`, bounding box algorithms are wasteful. Mathematical radial equations explicitly calculate exactly when cloud LOD layers structurally puncture optical density, gracefully unloading layers exactly when penetrated algebraically without relying on expensive screen-bounds projections.

---

### Section C: Advanced Graphics & Shader Processing

**C1. Distant Atmospheric Diffusion** → **(y) Applied Low-Cost Blurring**
- **Rationale**: The outermost 2D cloud parameters receive a native anisotropic blur mathematically mimicking the Rayleigh atmospheric glow evaluated explicitly at orbital scales, flawlessly disguising hardware aliasing on the 4K B/W Atlas natively.

**C2. Dynamic Sun Angle Normal Maps** → **(y) Generated Fake Normals (Clouds & Ground)**
- **Rationale**: When zooming physically closely, evaluating raw flat 2D contrast pixels is perceptually weak. Evaluating a high-speed real-time relative offset mask algorithm generates 3D pseudo-bump textures mapping physical planetary lighting vectors dynamically against the clouds (and surface). Bypassed completely at macro orbital scales to save processing natively.

**C3. Structural Texture Cross-Fading** → **(n) Hard Swapping Evaluated**
- **Rationale**: The massive velocity of the physical descent naturally disguises texture popping structurally. Developing 2-second overlapping Alpha cross-fades wastes double the required GPU active samplers temporarily; hard-swapping handles handoffs cleanly.

---

## New Types Summary

```typescript
// Potential Type alterations explicitly targeting the Config infrastructure
interface ConfigVisuals {
    // ...
    cloudAtlasUrl: string;       // The single AI-generated atlas mapped by the Pre-Loader
    cloudUpscaleLODTiers: number; // The dynamic iteration depth (calculated locally via radius)
}
```

---

## Unfinished Business Coverage

- [x] Integrate AI-Generated 4K Maps organically → covered by [Section A1]
- [x] Protect Strict Codebase Boundaries (Pre-Loader vs Minigame) → covered by [Section A1]
- [x] Minimize massive VRAM consumption natively → covered by [Section A2 & B2]

---

## Ready for `/create-phase-plan`

All 7 decisions locked. Proceed to phase planning when ready.
