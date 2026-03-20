# ver_01_chunk_01_phase_01_transparent_edge_blending

> Implement radial alpha post-processing so generated square images seamlessly fade at their borders when projected onto spherical caps.

---

## 01.1 Purpose

When 14 separate images are physically stacked into a 3D environment above a planet surface, hard square texture edges shatter immersion. We must enforce a radial transparency gradient across every AI-generated texture so the deep features fade flawlessly into the larger parent texture wrapping the layer beneath it.

---

## 01.2 Scope (IN / OUT)

### IN
- Write a canvas-based `applyCircularAlphaGradient` utility.
- Pass generated textures through this utility before uploading to GPU memory.
- Confirm Babylon StandardMaterial settings properly interpret soft alpha transitions.

### OUT
- Spherical mesh construction (Phase 00).
- Camera scaling mechanics (Phase 02).

---

## 01.3 Deliverables

- [x] [D01-01] Create `applyCircularAlphaGradient(base64: string): Promise<string>`.
- [x] [D01-02] Use a canvas context `createRadialGradient` spanning exactly the center out to the edge.
- [x] [D01-03] Test blending modes (`destination-in` or similar) to mask out the image's bounding box.
- [x] [D01-04] Integrate `applyCircularAlphaGradient` into the texture prep pipeline in `PlanetEngine.ts`.

---

## 01.4 Implementation Details

### 01.4.1 PlanetEngine.ts (Canvas Utility)
The gradient will use `addColorStop(0, 'rgba(0,0,0,1)')` at the center, maintaining 100% opacity until radius `R * 0.7`, and interpolating down to `addColorStop(1, 'rgba(0,0,0,0)')` at the bounds.

---

## 01.5 Isolation Requirements

- **Inputs required**: Phase 00 Base Generation output logic.
- **Outputs produced**: Masked `image/png` base64 strings ready for Babylon Texture import.

---

## 01.6 Gap Checklist

- [x] Does the `destination-in` context operation correctly maintain color channels?
- [x] Do stacked alpha layers impact rendering performance heavily when 14 occupy the viewport?

---

## 01.7 Gate Checklist

- [x] Exported layers visually exhibit soft edges without artifacting.

---

## 01.8 Verification Tests

### Unit Tests
- [x] Log visually exported textures and ensure alpha bounds are valid.

---

## 01.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Test 1  | ✅ Pass | Visual mesh rendering confirms 14 overlapping patches fade radially perfectly into each other. |

---

## 01.10 Completion Criteria

This phase is DONE when:
- [x] All deliverables marked `[x]`
- [x] All gap/gate checklist items answered affirmatively
- [x] Test results table updated with outcomes
