# ver_01_chunk_01_phase_02_3d_descent_physics

> This phase governs the camera animation logic. Instead of swapping to an orthographic trick, it locks the `ArcRotateCamera` and simply animates its physical orbital radius from space all the way down to the surface across the designated 30 minutes.

---

## 02.1 Purpose

The ultimate goal of this project is to simulate diving into an orbit. With 14 high-resolution physical spherical caps stacked dynamically on the planet's surface (implemented in Phase 00 and 01), the camera no longer needs to mathematically scale the terrain. It simply dives. This phase maps the user's `tripDuration` slider directly to the physical distance the camera must travel.

---

## 02.2 Scope (IN / OUT)

### IN
- Calculate total orbital distance (e.g. `R=20` to `R=5.0025`).
- Animate `ArcRotateCamera.radius` smoothly over `T` seconds.
- Implement a terminal velocity easing curve (cubic `ease-in` transitioning into uniform logarithmic descent rate).
- Update the camera's `minZ` dynamic adjusting to prevent planetary clipping when heavily zoomed in.

### OUT
- Generation pipeline dependencies.
- React state synchronization (Phase 03).

---

## 02.3 Deliverables

- [ ] [D02-01] Remove `playZoomSequence` orthographic or scaling loop logic from `PlanetEngine.ts`.
- [ ] [D02-02] Build `initiatePhysicalDescent(tripDuration: number)` that handles the entire animation loop via `onBeforeRenderObservable`.
- [ ] [D02-03] Compute a math curve determining `radius` at time `t`, simulating a fast orbital plunge that dramatically slows down as the terrain approaches to portray terminal velocity.
- [ ] [D02-04] Hook this descent trigger directly to the `Approach` UI button.

---

## 02.4 Implementation Details

### 02.4.1 Descent Math
Because the geometry pieces span exponentially smaller bounds, a strictly linear speed (`R` drops by 0.1 per second) will crash into the ground instantly. The descent formula must apply a cubic or logarithmic map, enforcing the cinematic "terminal velocity" visual effect over up to 30 minutes.

---

## 02.5 Isolation Requirements

- **Inputs required**: Phase 00 physical geometry.
- **Outputs produced**: Finalized descent sequence visually culminating at the highest resolution asset.

---

## 02.6 Gap Checklist

- [ ] Does jumping from 10,000 kilometers down to 1.2 meters cause double-floating point precision jitter on the camera?

---

## 02.7 Gate Checklist

- [ ] Log test validates that camera reaches exactly `R=5.0025` precisely when `elapsedTime == tripDuration`.

---

## 02.8 Verification Tests

### Unit Tests
- [ ] 1-minute speedy dive test confirms visual seamlessness.

---

## 02.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Test 1  | ⬜ Pending | |

---

## 02.10 Completion Criteria

This phase is DONE when:
- [ ] All deliverables marked `[x]`
- [ ] All gap and gate checklist items passing
- [ ] All test results recorded
