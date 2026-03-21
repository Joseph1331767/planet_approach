# Phase 07: AAA Holographic Rhythm Mechanics

## 1. Description
This phase overhauls the `TurbulenceController` rhythm mechanics. Currently, the system lacks visual hit-boxes and distinct visual states for the telegraphs (White w/ Trail, White Flashing, Blue). This phase will upgrade the mechanic into a proper AAA-feeling reflex system with readable feedback loops.

## 2. Deliverables
- A visible HUD/Hitbox element locked to the dashboard where the holographic letters must be caught.
- Distinct particle/mesh visual states telegraphing the required action:
  - **Sustained Hold:** Extended geometry/trail (White).
  - **Rapid Tap:** Pulsing/Flashing emission (White).
  - **Single Press:** Standard visual (Blue).
- Logic updates to correctly evaluate "Hold" vs "Tap" inputs rather than treating everything as a single instantaneous keystroke.

## 3. Gap Checklist
- [x] Add stationary 'catcher' hitboxes (Left and Right hands) at the Z=0 target zone.
- [x] Implement support for the optional `typographyGlbUrl` from the Spec for 3D meshes (falling back to 2D UI texture planes if null).
- [x] Add distinct visual states mapped to specific key spawns.
- [x] Implement `keyup` tracking for Sustained Holds context.
- [x] Introduce real-time hit/miss visual feedback (coloring the letter green or red).

## 4. Acceptance Criteria
- The player clearly sees the target zone on their screen.
- Notes visually differ based on the action required.
- The player successfully interacts with hold mechanics and rapid tap mechanics without instantaneous failure triggers.
