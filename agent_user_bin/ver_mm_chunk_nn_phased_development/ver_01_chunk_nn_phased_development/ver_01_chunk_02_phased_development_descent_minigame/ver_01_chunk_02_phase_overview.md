# Descent Minigame — Development Phase Checklist (Abstracts + Purposes)

> High-level phase map detailing the construction of the Chunk 02 Descent Minigame library.
> Next step: Create individual `.md` tasks per phase upon approval.

---

## Phase Status
| Phase | Title | Status |
|-------|-------|--------|
| 00    | Foundation + Core Engine | ✅ Complete |
| 01    | Terminal Protocols & Alignment | ✅ Complete |
| 02    | Holographic Turbulence & Physics | ✅ Complete |
| 03    | Alarms & Cognitive Comms | ✅ Complete |
| 04    | AAA VFX & "Grand Illusion" Handoff | ✅ Complete |
| 05    | Gap Analysis Audit | ✅ Complete |
| 06    | Ambient Orbital Approach Pacing | ⬜ Pending |
| 07    | AAA Holographic Rhythm Mechanics | ⬜ Pending |
| 08    | Bug Squashing & Minigame Stability | ⬜ Pending |

---

## Phase 00 — Foundation + Core Engine
**Purpose:** Scaffold the isolated library architecture, remote config loading, and baseline 3D environment.
- Construct the `MinigameOrchestrator` state machine.
- Implement the JSON `ConfigManager` and wire up the React `DevSettingsPanel` overlay.
- Pre-render the baseline Babylon.js environment containing the Equirectangular slices, the DirectionalLight (Sun), and the 3D GUI Dashboard mesh structure.

**Key outputs:**
- A running, configurable isolated library instance with a lit planet and an empty 3D dashboard ready for widgets.

---

## Phase 01 — Terminal Protocols & Alignment
**Purpose:** Implement the pre-minigame orbital launch terminal sequence.
- Build the `PreLaunchTerminal` class to parse string inputs.
- Render the interactive protocol checklist on the 3D Dashboard.
- Calculate the `orbitLaunchWindowPercent` completion time to strictly penalize the upcoming descent scalars if the window is missed.

**Key outputs:**
- The player can fully initiate the descent by typing protocol sequences (`cal-thr`, `exc-aut`) correctly before time runs out.

---

## Phase 02 — Holographic Turbulence & Physics
**Purpose:** Implement the core physical "pat belly rub head" rhythm mechanics and tether the mathematical physics.
- Build the `TurbulenceController` to stochastically spawn left-hand (`WSAD`) and right-hand (`IKJL`) hitboxes at differing frequencies.
- Animate holographic 3D typography (Hold, Rapid Tap, Quick Press) down the hyperspace lanes.
- Connect input success/failure state to the hidden `failureScalar` tracker.

**Key outputs:**
- A fully playable physical rhythm game layered over the descent, dynamically scaling based on config variables.

---

## Phase 03 — Alarms & Cognitive Comms
**Purpose:** Introduce the disruption mechanics to enforce "plate-spinning" cognitive load.
- Develop the padlock-wrapping (0-9 isolated digits) mathematical generation engine.
- Implement `VoiceCommsService` with `WebSpeechAPI` listener and the Numpad Failover mechanism.
- Trigger randomized explicit Terminal Alarms requiring immediate tertiary key-presses to break turbulence rhythm.

**Key outputs:**
- The player must actively perform mental math and voice dispatch while wrestling the physical turbulence controls.

---

## Phase 04 — AAA VFX & "Grand Illusion" Handoff
**Purpose:** Finalize the cinematic immersion and accurately output the failure scalar.
- Port and hook up the continuous `fbm()` plasma/heat-haze screen-space shader and multi-layer camera shake.
- Animate the shader intensity and terminal shake linearly across the 8-10 minute descent arc.
- Resolve the main Library Promise upon a visually localized "perfect landing", outputting the final `failureScalar` to the parent app gracefully.

**Key outputs:**
- A fully cinematic, terrifying atmospheric entry that successfully hides the mathematical drift from the player and passes control back down the pipeline.
