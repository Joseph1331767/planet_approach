# ver_01_chunk_02_phase_03_alarms_cognitive_comms

> Injects cognitive overload by requiring players to solve isolated "Padlock Math" algorithms via Voice API, and disrupts their physical piano-tile rhythm with sudden terminal alarms.

---

## 03.1 Purpose

A pure physical rhythm game is fun, but true "plate-spinning" panic is achieved when the brain must suddenly switch contexts to solve isolated math problems loudly, or break hand-positioning to silence a flashing alarm.

---

## 03.2 Scope (IN / OUT)

### IN
- Padlock Roll-Over Math Logic engine (0-9 wrapping).
- `VoiceCommsService.ts` utilizing navigator `WebSpeechAPI`.
- Numpad Failover mechanism for inaccessible microphone states.
- `AlarmManager.ts` to trigger random Dashboard text alarms tied to tertiary keys (e.g., `U`, `H`, `O`).

### OUT
- AAA Shaders & Final Handoff Output — Phase 04.

---

## 03.3 Deliverables

- [x] [D03-01] Build `PadlockMath.ts` ensuring digits wrap independently (e.g., `9+1=0`, `1-2=9`).
- [x] [D03-02] Implement `AlarmManager.ts` that intermittently overlays explicit text (`Thermal: Press [H]`) on the dashboard UI.
- [x] [D03-03] Wire up the `WebSpeechAPI` listener, validating vocalized integer strings against the Padlock answer.
- [x] [D03-04] Implement Numpad failover: if spacebar is held and a 3-digit number is typed, evaluate it just like a vocal input.
- [x] [D03-05] Apply massive temporary multiplier to `TurbulenceController` spawn frequencies if an alarm/math prompt is failed.

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 03.4 Implementation Details

### 03.4.1 Numpad Failover Priority
The Voice API can be flaky. If the browser denies permissions, immediately set a boolean `useFailover = true`. Update the UI prompt gracefully to inform the user to physically type the result via numpad rather than speak it. Let the user actively configure this in `<DevSettingsPanel />`.

### 03.4.2 Alarm Interruptions
When an alarm triggers, standard piano tiles should still spawn. The player must mentally choose to sacrifice a tile hit in order to reach across the keyboard and silence the alarm, creating severe mechanical tension.

---

## 03.5 Isolation Requirements

- **Inputs required**: Phase 02 `TurbulenceController` scaling modifiers.
- **Outputs produced**: Massive penalty multipliers added to the `failureScalar` upon cognitive failures.
- **No forward dependencies**: True.

---

## 03.6 Gap Checklist

Before proceeding to the next phase, answer explicitly:

- [x] Does the math correctly clamp/wrap each individual digit (e.g. `345` + `0+10` = `305`)?
- [x] Can the Voice API robustly understand "Three Zero Five"? Are we stripping whitespace effectively?

---

## 03.7 Gate Checklist

Hard requirements that MUST pass before this phase is complete:

- [x] [Gate 1: The module MUST continue flawlessly if a microphone does not exist or permissions are blocked.]

---

## 03.8 Verification Tests

### Unit Tests
- [x] [Test 1: Padlock Math independently wraps correctly across extreme bounds]

---

## 03.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| T03.1 | ✅ Pass | Tested independently rolling wrapped sums. |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 03.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes
