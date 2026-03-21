# ver_01_chunk_02_phase_04_aaa_vfx_grand_illusion

> Instills the AAA cinematic visuals using FBM shaders and dynamic camera shake, concluding the library execution with a perfect visual landing and passing out the hidden logic scalar.

---

## 04.1 Purpose

This phase transforms a mechanical typing simulator into a terrifying cinematic AAA experience, wrapping all the logic inside dynamic `fbm()` plasma shaders, heat distortion logic, and translating the `failureScalar` out of the module natively.

---

## 04.2 Scope (IN / OUT)

### IN
- Screen-space GLSL Post-Process Shaders (Plasma, Heat Haze, Speed Lines).
- Multi-layer `PerlinNoise` / Stochastic `DescentCamera` shake.
- Cinematic timing mapping (shader intensity tied to orbit depth duration).
- Clean Orchestrator module tear-down & Output Promise resolution.

### OUT
- Ground terrain parsing (handled beyond minigame scope).

---

## 04.3 Deliverables

- [x] [D04-01] Implement `AtmosphereEffects.ts` encompassing the `reentryPixelShader` utilizing FBM logic.
- [x] [D04-02] Scale shader intensity (`heatIntensity`) automatically over the 8-10 minute orbit timer curve (cool -> blazing -> cool).
- [x] [D04-03] Hook `DescentCamera` shakes to react aggressively when mistakes are made in Phase 02/03.
- [x] [D04-04] Calculate final `failureScalar` (clamped `0.0` - `1.0`).
- [x] [D04-05] Visually render a locked, perfectly centered UI zoom-in landing, then gracefully resolve the main pipeline Promise returning the scalar variable.

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 04.4 Implementation Details

### 04.4.1 The Grand Illusion Output
Regardless of how badly the player failed physically (-0.8 `failureScalar`), the zoom-in images from Chunk 01 should *always* zoom identically to the direct center. The parent game calling `DescentMinigame.start()` will inherently await the promise. Upon resolution, it destroys the module container entirely and shifts the *beacon mesh* based on the returned scalar.

### 04.4.2 Visual Overdrive
When the player fails a voice check or typing protocol, immediately jolt the `reentryVisualsAmp` modifier and apply an intense impulse to the camera rotation.

---

## 04.5 Isolation Requirements

- **Inputs required**: High-res `equirectangularMaps` via the configuration payload, and the final `failureScalar`.
- **Outputs produced**: Clean destruction of Babylon.js Instance. Output `0.0` to `1.0` integer.
- **No forward dependencies**: True.

---

## 04.6 Gap Checklist

Before proceeding to the next phase, answer explicitly:

- [x] Do the visual atmospheric effects dramatically shift and react to player failure?
- [x] Does the module beautifully shut down, clear variables, and return control to the master thread without leaking Babylon contexts?

---

## 04.7 Gate Checklist

Hard requirements that MUST pass before this phase is complete:

- [x] [Gate 1: The module must yield a mathematically accurate clamped `[0.0, 1.0]` scalar based on collected penalties.]

---

## 04.8 Verification Tests

### Unit Tests
- [x] [Test 1: Output Promise calculates maximum clamp at 1.0 correctly]

---

## 04.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| T04.1 | ✅ Pass | Evaluated Orchestrator bounding clamping natively |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 04.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes
