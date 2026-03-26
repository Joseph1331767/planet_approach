# Investigation Pass 2: Inter-Engine Vector Translations
**Objective**: Evaluate exactly how the `MinigameOrchestrator.ts` transfers the Babylon.js object reference frame into the WebGPU arbitrary shader coordinate system. Ensure no inversions, offsets, or invalid transformations exist between engine and custom pass.

## 1. `onApplyObservable` Shader Variable Bindings
In `MinigameOrchestrator.ts`, the compute environment binds multiple variables per-frame for the full screen quad.
Two `effect.setVector3("sunDir", ... )` assignments were isolated. 

## 2. First Initialization (Obsolete)
Line 694 binds a hardcoded `Vector3(-1, -0.5, 1).normalize()`. This is immediately overwritten later in the exact same execution block and is practically irrelevant.

## 3. Dominant Translation Vector
Line 721 defines the authoritative variable binding:
`effect.setVector3("sunDir", this.sunLight.direction.scale(-1.0).normalize());`
1. Resolves `this.sunLight.direction` which is statically `(-1, -0.5, 1)`.
2. Multiplies entirely by `-1.0`. The resultant vector evaluates correctly to `(1, 0.5, -1)`.
3. Normalizes perfectly to 1.0 length.

## Pass 2 Conclusion
Volumetric lighting shaders fundamentally require the active *Sun Vector* to point *physically towards the sun itself* from the arbitrary origin. Babylon's innate engine vector specifies *light travel trajectory*, which is opposite. The manual translation `.scale(-1.0)` perfectly handles this geometric alignment mismatch. The shader vector relies on clean data from the host.
