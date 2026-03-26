# Deep Investigation: Cloud Lighting & Sun Vector

## Pass 1: Sun Light Source Analysis
*Objective: Determine how the physical `DirectionalLight` is created, where it points, and if it moves or stays stationary.*

**Investigation Complete**:
- In `MinigameOrchestrator.ts`, the sun is instantiated permanently targeting `Vector3(-1, -0.5, 1)`. 
- By Babylon standard, `DirectionalLight` direction represents *light travel direction* (photon path). The sun does not move relative to the world axes.

## Pass 2: Shader Vector Translation
*Objective: Evaluate how `MinigameOrchestrator.ts` extracts `sunLight.direction` and passes it to WebGPU as `sunDir`, including any inversions or matrix transformations.*

**Investigation Complete**:
- The `onApplyObservable` method assigns the `sunDir` uniform natively.
- `effect.setVector3("sunDir", this.sunLight.direction.scale(-1.0).normalize());`
- It successfully scales it by `-1.0`, effectively passing `(1, 0.5, -1)` into WebGPU. This safely reverses the photon path into the required mathematically-correct "Vector pointing TO the light source".

## Pass 3: WGSL Lighting Mathematics
*Objective: Mathematically trace the `sunDir` vector through `sampleTransmittanceLUT`, `mu_p`, `shadowT`, and `Sint` inside `cloudShellShader.ts` to prove exactly why the final pixel output is dark.*

**Investigation Complete**:
- The vector math is mathematically perfect: `sDir` aligns seamlessly with `p/r_p` over the daylight hemisphere (generating `mu ~ 1.0` / Bright Zenith Light) and directly opposes it on the night hemisphere (`mu ~ -1.0` / Dark Purple Night Sky). The sun vectors are flawless.
- **The True Bug**: The user described "dark clouds" because the global reductions to `densityMul` made the clouds physically only `~20%` opaque over their physical geometry. Blending `20%` white clouds over the deep black background of empty space rendered them visually as invisible dark gray ghosts. If we raise the physical density multiplier to return them to `100%` solid white visual opacity, `shadowT` self-shadows into a dark silhouette wall. We MUST fundamentally decouple `Camera Extinction Density` from `Sun Shadow Extinction Density`.
