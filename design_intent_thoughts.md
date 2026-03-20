# Infinite Zoom: Design Intent & Subsystem Spec

## Current State vs User Intent
The previous architecture used a "2-layer fade-and-scale" visual trick. It locked the camera in place and scaled two patches rapidly to create the illusion of infinite zoom. However, this broke the user's immersion and resulted in wildly inaccurate perceived descent times, as well as physics that felt inherently disconnected from actual space exploration.

**The user's True Intent:**
1. **Physical Parity:** The descent must be a genuine 3D journey from outer space to the planet's surface. No teleports, no camera lock-tricks. Just pure, mathematically accurate 3D translation.
2. **Stacked Physical Layers:** Instead of swapping images on a single mesh, all 14 post-processed AI-generated layers must physically exist in the 3D world, stacked like ultra-thin onion skins directly on top of the `pickedPoint`.
3. **Flawless Alpha Blending:** Each of those 14 layer skins must be processed such that its borders seamlessly fade to transparent, creating a perfect nested gradient. As the camera flies physically closer, smaller layers come into focus.
4. **Cinematic Real-Time Descent:** A trip that actually takes minutes to complete, modeling real terminal velocity curves as the camera descends through the altitude layers.
5. **Exact Match:** The final smallest layer ($2^{-14}$ scale) must fill the screen perfectly when the camera reaches the final altitude.

## Core Mechanics Analysis

To achieve this, we must discard the visual illusions and build a 1:1 physical simulation of the zoom stack.

### 1. Angular Sizing of Nested Layers
- **Base Image:** Built using a 90-degree FOV ($1.57$ radians). Covers 90 degrees of the planet's surface.
- **Layer 1:** Covers exactly 45 degrees.
- **Layer N:** Covers $90 \cdot 2^{-N}$ degrees.
- We will construct custom 3D Spherical Caps for each layer that match these exact mathematical arcs.

### 2. Physical Layer Stacking (Z-Fighting Prevention)
- The base planet is at exactly `radius = 5.000000`.
- Layer 0 is at `radius = 5.001000`.
- Layer N is at `radius = 5.001000 + (N * 0.000100)`.
- The final Layer 14 rests at `radius = 5.002400`. 

### 3. Edge Blending (Post-Processing)
- Current output is square.
- We must apply a radial alpha gradient (a CSS/Canvas `destination-in` trick) to every texture so its edges drop to `alpha = 0`.
- This ensures the square edges of deeper layers do not obscure the broader features of the layers beneath them.

### 4. Continuous Real-time Approach
- `tripDuration` sets the total time (e.g. 1800s for 30 minutes).
- We map an easing curve (e.g., cubic) to velocity. 
- Altitude maps from `R = 20.0` (space) down to `R = 5.0025` (hovering 0.0001 units above the final high-res nested scale layer).

## Next Steps
This transition requires a complete tear-down of `playZoomSequence` and the camera path logic.
This will be planned out via the `ver_01_chunk_01_phased_development_infinite_zoom` workflow.
