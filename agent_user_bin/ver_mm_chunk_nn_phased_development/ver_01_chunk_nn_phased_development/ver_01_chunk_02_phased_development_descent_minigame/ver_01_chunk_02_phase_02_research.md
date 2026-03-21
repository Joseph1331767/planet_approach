# Chunk 02 Phase 02: Holographic Rhythm Physics Research

## Objective
A frantic "pat belly rub head" rhythm minigame demanding split-second hand coordination, relying on mathematically perfect hit-detection across a massive timeframe while simultaneously rendering dozens of 3D typographic elements representing `WSAD` and `IKJL` keys. 

## AAA Implementation Techniques

### 1. Absolute Hit-Detection Timing
- **The Issue:** `setInterval` or `setTimeout` mechanisms in standard JavaScript are entirely subject to main-thread blocking. A 600ms rhythm tap interval will gradually drift out of sync if the browser repaints slowly.
- **AAA Implementation:** Modern rhythm games built in JavaScript entirely abandon `performance.now()` relying on relative delta times. We must leverage absolute floating-point tracking using elapsed game time, or even `AudioContext.currentTime` if synced to an audio track. Because our minigame relies on a stochastic engine entirely decoupled from an audio BPM track, we must use Babylon `scene.onBeforeRenderObservable` to tally absolute `elapsedTime`. The hit box validation window (`const targetZ = 0`) must compare the absolute instantiated timestamp of the tile against the absolute input timestamp.

### 2. Rendering the Holographic Stream 
- **The Issue:** Spawning hundreds of individual 3D `MeshBuilder.extrudeText` primitives dynamically every 1-3 seconds over an 8 minute period will inevitably crash any WebGL instance due to ballooning vertex counts and memory leaks.
- **AAA Implementation:**
  1.  **Avoid Real Meshes:** Do not generate native 3D text primitives dynamically.
  2.  **Texture Sprites & Instancing:** We must utilize `SpriteManager` or standard square 3D planes utilizing dynamic GUI textures, then **instance** those planes. We simply translate the instanced planes along the `Z-axis` towards the `DescentCamera`.
  3.  **Strict Object Pooling:** Because we know there are only 8 possible letters (`W, S, A, D, I, K, J, L`), we must use an **Object Pool**. Instantiate 20 blank planes per column at compile time, set them to `isVisible = false`, and simply recycle them by moving their Z-axis transform back into deep space when they are either hit by the player or pass behind the dashboard. Never call `new Mesh()` during the active descent loop.
