# Chunk 02 Phase 04: AAA VFX Research

## Objective
To leverage fractional Brownian motion (fBM), screen-space distortions, and deep multi-layered camera shake mathematically tied to the hidden `failureScalar` to create a terrifying cinematic entry experience.

## AAA Implementation Techniques

### 1. FBM Shader Optimization
- **The Issue:** Generating 6+ octaves of Perlin Noise per pixel directly in the fragment shader 60 times a second can bring mid-tier mobile GPUs to a crawl, causing stutters that ruin the precision time-tracking required by Phase 02.
- **AAA Implementation:**
  - **Smarter Octaves:** Keep the `fbm()` loop capped at 3 or 4 octaves.
  - **Resolution Scaling:** Babylon's `PostProcess` layer accepts a `ratio` parameter. Instead of rendering the post-process plasma shader at `1.0` (native screen resolution), we can render it at `0.5` or `0.75` and let the hardware up-scale the hazy plasma back to full size. This immediately halves the fragment math cost, while heat/haze naturally looks fine slightly blurred. 
  - **Precomputed Noise Textures:** While mathematically pure, it is vastly more performant to sample a small `256x256` tiling seamless noise texture (`texture2D(noiseSampler, uv)`) and layer it over itself rolling at different `time` speeds, rather than invoking heavy `sin`/`cos` procedural math for every pixel.

### 2. Multi-Frequency Camera Shake
- **The Issue:** A simple randomized screen jiggle (e.g. `camera.position.x += Math.random()`) looks amateur, jittery, and entirely betrays the "AAA Studio" requirement.
- **AAA Implementation:** Camera shake simulating G-forces must utilize **continuous stochastic noise** (like 1D Perlin) composed of multiple frequencies. 
  1. A low-frequency, high-amplitude sine wave simulating the massive structural bends of the ship (the "groan").
  2. A high-frequency, low-amplitude noise simulating the rapid kinetic vibration of atmospheric friction (the "rattle").
  By summing these two curves tied directly to `engine.getDeltaTime()` and multiplying them by the `failureScalar`, the camera shake feels intensely violent but organic, like a real physical object being ripped apart.
