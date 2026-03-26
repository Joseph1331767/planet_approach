# Interview: Deterministic Cloud Seeder (Chunk 2.5)

## Interview Summary — 2026-03-22
This document persistently logs the architectural decisions and technical parameters locking in the procedural LOD transitions required for the Chunk 2.5 Infinite Zoom planetary cloud mechanics.✅ Locked: A1, A2, A3, Y1, Y2, Y3
⬜ Remaining: None

---

## Technical Architecture Decisions

**A1. Data Transfer Format (Pre-Loader to Minigame)** → **(a) Single 4K Image / Blob URL mapped to a Real-Time Upscaler**
- *User question addressed*: Currently, the configs load static URLs natively through HTTP Requests. Option C was indeed a parallel cache branch.
- *Locked Decision*: Instead of generating 14 images and figuring out how to transfer them, **we transfer precisely ONE 4K image** as a Blob/URL. We will explicitly build a Real-Time WebGL Cloud Upscaler (a custom shader or dynamic texture material) inside the Minigame. It will recursively sample the texture's center region in UV space (`1/2w x 1/2h`) directly towards the camera's focal impact point on the planet surface. That mathematical sample is then upscaled natively and daisy-chained for subsequent LOD layers, eliminating absolute VRAM bloat and solving the data-transfer crisis perfectly.

**A2. Ground Layer Un-Merge Altitude Threshold** → **(User Custom) Permanent Separation via Dynamic RT Scoping**
- *Locked Decision*: The mega layers (that span beyond FOV) organically merge down natively, while smaller layers absolutely remain disjointly layered on top forever.
- Given the Real-Time Upscaler paradigm above, the clouds natively maintain their own pure alpha-sphere over the planet indefinitely, actively resampling the 4K texture coordinates based strictly on current zoom percentages.

**A3. Sub-Pixel Culling Strategy** → **(a) Strict Radial Altitude Banding (Dynamic)**
- *Locked Decision*: Instead of a static "13-14 tiers", the calculation is 100% dynamic. The radial equations dictate precisely how far we are nested into the fractals algorithm, abandoning evaluations purely mathematically as we punch entirely through physical Cloud altitudes.

---

## AI Unique Suggestions (Locked)

**Y1. Add a low-cost atmospheric blur to distant 2D clouds?** → **(y) YES**
- Will seamlessly hide aliasing during the extreme ranges before true FBM volumetrics physically extrude properties.

**Y2. Should we generate a dynamic Fake Normal Map from the B/W mask?** → **(y) YES (For Clouds AND Ground)**
- *Caveat locked*: Only explicitly active on proximal zoom tiers where geometric sun angles physically diverge enough across the mesh to warrant shading. At extreme starting scales, it's mathematically useless.

**Y3. Implement dynamic opacity cross-fading strictly between LOD layers?** → **(n) NO**
- Hard-swapping is optimal, performant, and sufficiently disguised by the inherently fast descent velocities. Can be revisited iteratively if seams manifest.
