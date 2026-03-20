# ver_01_chunk_01_phase_00_foundation_and_subsystem

> Re-engineer the rendering logic to stack 14 physically distinct spherical caps resting on the planet surface.

---

## 00.1 Purpose

The illusion of infinite zoom previously relied on 2 flat rendering patches swapping textures while being scaled relative to the screen. This severely broke immersion. The new architecture dictates generating 14 discrete, curved slices of a sphere—each progressively smaller in angular size—and stacking them to create a physical "Mandelbrot-like" telescope into the planet surface.

---

## 00.2 Scope (IN / OUT)

### IN
- Calculate exact spherical limits for decreasing angular arcs (from 90 degrees down to $90 \cdot 2^{-14}$ degrees).
- Generate 14 custom curved meshes in `PlanetEngine.ts` upon zoom readiness.
- Apply unique incremental radius values to prevent Z-fighting rendering issues.

### OUT
- Camera descent animation — Handled in Phase 02.
- Alpha blending radial mask — Handled in Phase 01.

---

## 00.3 Deliverables

- [x] [D00-01] Implement mathematical sizing for layer spheres limits (calculating radians/arc parameters for Babylon geometry generation).
- [x] [D00-02] Update `playZoomSequence` to instantiate an array of 14 meshes instead of just two patches.
- [x] [D00-03] Ensure orientation math locks all new caps exactly to `pickedPoint.normalize()`.

---

## 00.4 Implementation Details

### 00.4.1 PlanetEngine.ts (Curved Meshes)
Currently, `createCurvedPatch(index)` creates a slice. A standard sphere `slice` chops altitude. To build a proper cap centered on an axis, using custom primitive generation or precisely calculating the slice parameter and rotating it is required. Geometry must be instantiated only once per session. 

---

## 00.5 Isolation Requirements

- **Inputs required**: Functional texture generation pipeline and a valid `pickedPoint`.
- **Outputs produced**: 14 aligned, sized meshes rendering simultaneously over the planet.
- **No forward dependencies**: Yes.

---

## 00.6 Gap Checklist

- [x] Does stacking 14 custom physics meshes cause rendering artifacts (z-fighting)?
- [x] Do the mesh arc scales map 1:1 precisely to a 2x zoom factor relative to the layer beneath them?

---

## 00.7 Gate Checklist

- [x] Exact coordinate projection verifies the surface is seamlessly mapped.

---

## 00.8 Verification Tests

### Unit Tests
- [x] Render 14 overlapping meshes visibly intersecting the test picked point.

---

## 00.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Test 1  | ✅ Pass | Visual mesh rendering confirms 14 overlapping patches oriented correctly |

---

## 00.10 Completion Criteria

This phase is DONE when:
- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes
