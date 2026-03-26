# ver_01_chunk_02_5_phase_02_webgl_upscaler

> Overhauls the static 2D projection sphere entirely natively migrating rendering into a mathematically custom WebGPU/WebGL Shader evaluating real-time fractional UV space sampling (Cropping & Upscaling) mathematically tracking the descent vector.

---

## 02.1 Purpose

To avoid transferring 14 gigabyte LOD configurations, this shader algorithm strictly evaluates a `1/2x1/2` square sample off the 4K Atlas perfectly centered over the physical impact point on the planet surface natively zooming infinitely as the radius drops automatically scaling dynamically via GPU physics without stressing the Javascript main thread.

---

## 02.2 Scope (IN / OUT)

### IN
- A custom Babylon `ShaderMaterial` strictly bound to the Cloud Sphere.
- Dynamic Uniform injection tracking `camera.position` transformed into local UV spherical coordinates natively.
- Recursive fractional coordinate math accurately mapping bounding boxes inside the shader.

### OUT
- Phase 02 Raymarching geometry (Deferred to Phase 04 integration).

---

## 02.3 Deliverables

- [ ] [D02-01] Create `cloudUpscaleShader.ts` scaffolding WGSL / GLSL logic for fractional zooming natively.
- [ ] [D02-02] Replace the StandardMaterial from Phase 01 securely mapping the new `ShaderMaterial` bounds.
- [ ] [D02-03] Continuously inject the normalized optical intersection vector natively mapping where the camera structurally points at the ground mathematically translating into spherical UV dimensions.
- [ ] [D02-04] Calculate LOD Zoom Tier algebraically mapping `camera.radius` into fractional `x2` multipliers securely sampling the atlas.

---

## 02.4 Implementation Details

### 02.4.1 Upscaler Math
```wgsl
let sampleRadius = 1.0 / pow(2.0, zoomTier);
let finalUV = focalUV + (vUV - 0.5) * sampleRadius;
let cloudSample = textureSample(atlasMap, atlasSampler, finalUV);
```

---

## 02.5 Isolation Requirements

- **Inputs required**: The texture target bound strictly via Phase 01 dynamically.

---

## 02.6 Gap Checklist

- [ ] Does the fractional upscaling dynamically evaluate seamlessly matching the physical ground expansion exactly without visual desync?

---

## 02.7 Gate Checklist

- [ ] [Gate 1] Shader mathematically compiles securely without WebGPU translation crashes mechanically.

---

## 02.8 Verification Tests

### Manual Verification
- [ ] Physically drop towards the target and explicitly visually verify the 2D clouds expand natively x2 at exact intervals cleanly tracking the identical visual coordinate perfectly.

---

## 02.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Drop Sync Test | ⬜ Pending | |

---

## 02.10 Completion Criteria

This phase is DONE when:
- [ ] All deliverables marked `[x]`
