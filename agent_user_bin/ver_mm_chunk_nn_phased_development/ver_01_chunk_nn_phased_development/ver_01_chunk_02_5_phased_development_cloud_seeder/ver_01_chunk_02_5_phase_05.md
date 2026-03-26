# ver_01_chunk_02_5_phase_05_advanced_visuals

> Infuses dynamic graphical shader post-processing flawlessly applying Anisotropic Atmospheric Ray-Blur natively disguising distant shell geometry, and real-time contrast-generated Fake Normal Mapping shading geometry aggressively accurately reacting dynamically mimicking true 3D shadows cleanly.

---

## 05.1 Purpose

Before the 3D Raymarcher handles physical depth at low altitudes dynamically natively, the mid-range 2D Sphere geometry perfectly lacks geometric self-shadowing strictly intrinsically resulting cleanly in flat lighting natively. Generating an immediate dynamic Height/Normal shadow bump parameter perfectly mimics structural depths organically identically exactly resolving optical deficits prior to altitude thresholds beautifully.

---

## 05.2 Scope (IN / OUT)

### IN
- Modifying `cloudUpscaleShader.ts` adding offset gradient derivative evaluations structurally generating Fake Normals.
- Injecting light-vector dependent dot-product mathematical shadow parameters natively into the 2D sphere geometry.
- Applying a mild pixel radial blur natively perfectly exactly softening distant bounds optimally.

### OUT
- True Raytraced shadows securely since that involves massive compute dispatch mathematically identically natively!

---

## 05.3 Deliverables

- [ ] [D05-01] Implement `gradient(uv)` mathematical derivative approximations natively sampling the Atlas bounds locally effectively extracting structural slopes algorithmically natively.
- [ ] [D05-02] Dot the extracted structural normal vectors linearly identically mapping the true global `scene.lights[0].direction` strictly structurally.
- [ ] [D05-03] Algebraically scale the Normal evaluation math exclusively evaluating proportionally mapping `zoomTier`; forcing the vectors to flatten securely when fully zoomed out natively resulting structurally resolving physics perfectly avoiding aliasing optimally cleanly.

---

## 05.4 Implementation Details

### 05.4.1 Fake Normal Generation Math
```wgsl
let eps = 0.001;
let left = textureSample(atlasMap, sampler, uv - vec2(eps, 0.0)).r;
let right = textureSample(atlasMap, sampler, uv + vec2(eps, 0.0)).r;
let fakeNormal = normalize(vec3(right - left, top - bottom, 2.0));
```

---

## 05.5 Verification Tests

| Test ID | Status | Notes |
|---------|--------|-------|
| 3D Normal Mapping Visual | ⬜ Pending | |

---

## 05.6 Completion Criteria

This phase is DONE when:
- [ ] All deliverables marked `[x]`
