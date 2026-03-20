# Infinite Zoom — Development Phase Checklist (Abstracts + Purposes)

> High-level phase map detailing the architectural shift to 3D physical nested layer stacking and realistic space descent physics.
> Next step: execute individual `.md` per phase following approval.

---

## Phase Status
| Phase | Title | Status |
|-------|-------|--------|
| 00    | Foundation & Physical Subsystem Constraints | ✅ Complete |
| 01    | Transparent Edge Blending Post-Processing   | ✅ Complete |
| 02    | Cinematic 3D Physics Descent                | ⬜ Pending |
| 03    | UI & Altitude Synchronization               | ⬜ Pending |

---

## Phase 00 — Foundation & Physical Subsystem Constraints
**Purpose:** Re-engineer the rendering logic to stack 14 physically distinct spherical caps resting on the planet surface.
- Calculate exact angular size for each layer ($90, 45, 22.5$ degrees...).
- Stack layers with incremental radii to prevent Z-fighting.
- Align all geometry structurally so its center maps mathematically to the user's `pickedPoint`.

**Key outputs:**
- Updated rendering engine capable of displaying 14 concentric semi-spheres simultaneously over the planet.

---

## Phase 01 — Transparent Edge Blending Post-Processing
**Purpose:** Eliminate square borders by fading textures into the surface below.
- Apply a radial gradient HTML Canvas post-processing step to every generated 1024x1024 texture.
- Feather the edges to `alpha = 0` via composite masking.

**Key outputs:**
- Seamlessly blended spherical meshes that look contiguous without clipping or visual breaks.

---

## Phase 02 — Cinematic 3D Physics Descent
**Purpose:** Discard 2D scaling illusions and physically fly the 3D camera from space to the ground.
- Transition camera animation to physically travel downwards into the Nested Spheres.
- Model realistic descent curves matching the user UI Slider (acceleration and terminal velocity mapping).

**Key outputs:**
- Actual physical camera animation that doesn't clip through the sphere, controlled dynamically by user time constraints.

---

## Phase 03 — UI & Altitude Synchronization
**Purpose:** Guarantee the final layer fills the user's screen mathematically perfectly when the camera arrives.
- Calibrate the minimum zoom altitude limit based on the camera FOV and the physical dimensions of the smallest rendered nest.

**Key outputs:**
- Verified 1:1 screen-fill metric upon landing.
