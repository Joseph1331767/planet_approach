# ver_01_chunk_01_phase_03_ui_and_altitude_sync

> Guarantee the final layer fills the user's screen mathematically perfectly when the camera arrives at the surface.

---

## 03.1 Purpose

When the camera reaches its final minimum altitude (e.g. `R=5.0025`), the inner-most layer (Layer 14) should consume the entire screen view. The exact required resting altitude is a function of the camera's FOV and Layer 14's physical dimension. This must be solved mathematically.

---

## 03.2 Scope (IN / OUT)

### IN
- Calculate precise $R_{end}$ distance where the layer's arc equals camera FOV.
- Update UI to clearly signify when the trip completes.
- Clean up the `agent_user_bin` artifacts (`04` obsolete files).

### OUT
- Babylon physics implementation.

---

## 03.3 Deliverables

- [ ] [D03-01] Solve equation: $2 \cdot \arctan(\frac{\text{MeshArc}}{2 \cdot \text{Distance}}) = \text{Camera.FOV}$.
- [ ] [D03-02] Bind computed $R_{end}$ directly as the terminal limit for the descent sequence.
- [ ] [D03-03] Delete obsolete Phase 04 files from the previous aborted checklist run.

---

## 03.4 Implementation Details

### 03.4.1 Altitude Sync
If $FOV = 0.8$ radians, and the smallest mesh has physical diameter $D = 2 \cdot \sin(\theta/2) \cdot 5.015$, then the camera radius $R_{end} = 5.015 + \frac{D}{2 \cdot \tan(FOV/2)}$. This calibrates the descent perfectly.

---

## 03.5 Isolation Requirements

- **Inputs required**: Working Phase 02 Descent.
- **Outputs produced**: Final polished product matching perfectly.

---

## 03.6 Gap Checklist

- [ ] Does screen resizing break the target aspect ratio bounds?

---

## 03.7 Gate Checklist

- [ ] The Layer 14 bounds mathematically perfectly align with rendering frame bounds at $T = \text{End}$.

---

## 03.8 Verification Tests

### Unit Tests
- [ ] Verify visual scale overlap in Dev Server.

---

## 03.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Test 1  | ⬜ Pending | |

---

## 03.10 Completion Criteria

This phase is DONE when:
- [ ] All deliverables marked `[x]`
- [ ] All gap and gate checklist items passing
- [ ] All test results recorded
