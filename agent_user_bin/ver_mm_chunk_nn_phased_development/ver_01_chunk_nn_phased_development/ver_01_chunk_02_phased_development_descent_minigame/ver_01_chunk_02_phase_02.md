# ver_01_chunk_02_phase_02_holographic_turbulence_physics

> Implements the "Pat Belly Rub Head" physical rhythm mechanic, generating stochastic holographic keys (`WSAD` / `IKJL`) trailing down hyperspace columns with disparate frequencies.

---

## 02.1 Purpose

The core physical challenge of the minigame. By forcing the left and right hands to operate on highly distinct stochastic frequencies (3-6s vs 1-3s), the player is physically overwhelmed with differing cadences, representing the violent multi-axis shifting of an atmospheric drop.

---

## 02.2 Scope (IN / OUT)

### IN
- `TurbulenceController.ts` stochastic spawner.
- Holographic 3D Typography rendering and Z-axis translation (traveling toward the player).
- Visual states: White+Trail (Hold), Flashing (Rapid Tap), Blue (Press).
- Hit-box collision and tolerance windows.

### OUT
- Alarms and Voice mechanics — Phase 03.

---

## 02.3 Deliverables

- [x] [D02-01] Build `TurbulenceController.ts` with two distinct asynchronous `setInterval` loops polling the `ConfigManager` ranges.
- [x] [D02-02] Render 3D Text objects starting far back in the Z-axis, moving forward toward the Dashboard Hitbox.
- [x] [D02-03] Implement hit detection tracking utilizing absolute timestamps.
- [x] [D02-04] Hook failures to explicitly add to the global `failureScalar` (e.g. `+0.01` per miss).

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 02.4 Implementation Details

### 02.4.1 Holographic Logic
Because Babylon GUI `TextBlock`s are 2D elements projected onto 3D planes, standard Babylon.js meshes (like `MeshBuilder.CreateText`) or standard 2D HTML/CSS overlays synced to 3D point-tracking might be required. Emulate the visual of typography stretching out into deep space (like Star Wars text). 

### 02.4.2 Visual States
Attach specific input validators to the visual states:
- **Blue**: Key down event must happen exactly when Z is within hitting bounds.
- **White (Trail)**: Key down must happen in bounds, and must NOT register a key up until Z clears the end trailing bounds.
- **Flashing**: Requires >X keydown events within the Z bounds.

---

## 02.5 Isolation Requirements

- **Inputs required**: Phase 00 Dashboard and MinigameOrchestrator state.
- **Outputs produced**: Continuous penalty updates to the `failureScalar`.
- **No forward dependencies**: True.

---

## 02.6 Gap Checklist

Before proceeding to the next phase, answer explicitly:

- [x] Are the left and right columns genuinely asynchronous resulting in "polyrhythm" overlaps?
- [x] Do missed tiles correctly augment the penalty scalar and despawn cleanly?
- [x] Does memory remain stable during rapid 3D text spawning and despawning over 8 minutes?

---

## 02.7 Gate Checklist

Hard requirements that MUST pass before this phase is complete:

- [x] [Gate 1: Garbage collection MUST be strictly enforced on despawned holographic keys using an object pool or explicit `.dispose()` calls.]

---

## 02.8 Verification Tests

### Unit Tests
- [x] [Test 1: `failureScalar` accurately tracks hit detection penalty logic]

---

## 02.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| T02.1 | ✅ Pass | Verified natively in test suite |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 02.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes
