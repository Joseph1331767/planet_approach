# ver_01_chunk_02_phase_01_terminal_protocols_and_alignment

> Implements the "Launch Window" pre-minigame where the player types specific string commands into a terminal UI before the ship completes its orbit, setting the baseline failure penalties.

---

## 01.1 Purpose

Players must organically prepare for the sheer panic of atmospheric entry without scrambling for keys. By utilizing a pure-keyboard typing protocol game during orbit, their hands are locked into position perfectly before the piano tiles begin.

---

## 01.2 Scope (IN / OUT)

### IN
- `PreLaunchTerminal` logic class (handling string concatenation and validation).
- Visual rendering of the Terminal Protocol list (e.g., `[ ] CAL-THR`) on the 3D Dashboard.
- Launch Window Timer calculations.
- `orbitLaunchWindowPercent` scalar penalty algorithm.

### OUT
- Physical piano-tile turbulence — Phase 02.

---

## 01.3 Deliverables

- [x] [D01-01] Build `PreLaunchTerminal` class to capture raw keyboard input strings.
- [x] [D01-02] Render a 3D GUI TextBlock list on the dashboard showing 3-5 pre-baked string protocols.
- [x] [D01-03] Implement a visual timer representing the ship's 75% orbit window.
- [x] [D01-04] If the sequence is typed correctly within the window, auto-transition the Orchestrator to `DESCENT` with `0.0` initial penalty.
- [x] [D01-05] If the timer expires, auto-transition to `DESCENT` with a severe initial `failureScalar` penalty.

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 01.4 Implementation Details

### 01.4.1 Keyboard Capture Listener
Since this is an isolated module, attach a raw `window.addEventListener('keydown')` explicitly tied to the orchestrator state `State.ALIGN`. Append valid characters to a buffer string, and clear the buffer on `Enter` or `Backspace`.

### 01.4.2 Penality Algorithm
The JSON config provides `timings.alignmentWindowMs`. If the player misses this limit, the base `failureScalar` begins at `0.2` rather than `0.0`, permanently crippling their chances of a perfect descent.

---

## 01.5 Isolation Requirements

- **Inputs required**: Phase 00 `MinigameOrchestrator` and `HolographicDashboard`.
- **Outputs produced**: The initial baseline `failureScalar` modifier for the drop.
- **No forward dependencies**: True.

---

## 01.6 Gap Checklist

Before proceeding to the next phase, answer explicitly:

- [x] Does the UI cleanly register user typing and highlight sequential steps correctly?
- [x] Does the orchestrator successfully push into `DESCENT` state either explicitly when completed, or forcefully when the timer expires?

---

## 01.7 Gate Checklist

Hard requirements that MUST pass before this phase is complete:

- [x] [Gate 1: Key listeners must automatically detach when transitioning states to prevent typing logic from polluting the piano-tile phase.]

---

## 01.8 Verification Tests

### Unit Tests
- [x] [Test 1: Timer expiration correctly applies severe penalty baseline.]

---

## 01.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| T01.1 | ✅ Pass | Verified natively in test suite |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 01.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes
