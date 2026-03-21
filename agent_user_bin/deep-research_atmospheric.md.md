# Planet-Scale Atmosphere and Volumetric Clouds for a Procedural AAA WebGPU Game

## What “100% real” means for a planet-scale sky
A planet atmosphere that reads as “real” at AAA quality is less about raw resolution and more about **physically plausible light transport that stays coherent from ground to space**. In production terms, you’re solving three coupled visuals: **distant sky radiance**, **aerial perspective (depth haze / extinction + in-scatter)**, and **cloud participating media** (including shadows). citeturn2view5

The hard part is that the most “brain-believing” moments—sunset, thick haze, god rays, cloud silverlining—are where **multiple scattering** stops being optional. entity["people","Sébastien Hillaire","real-time rendering engineer"] explicitly calls out that multiple scattering is “critical” for believable sunsets and to avoid the “yellow-ish atmosphere look,” and also that cloud media (high albedo) needs multiple scattering to avoid looking like dark smoke. citeturn2view5turn6view0

A second “planet-scale realism” requirement is **view continuity**: ground views must smoothly transition into space views (terminator, limb scattering, planetary shadows), without horizon banding or LUT artifacts. The EGSR 2020 technique describes itself as ground-to-space capable and designed to avoid the visual issues associated with high-dimensional LUTs. citeturn4view0turn0search1

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["earth atmosphere limb scattering photograph","sunset multiple scattering atmosphere rendering","aerial perspective mountains haze photo","volumetric clouds god rays example"],"num_per_query":1}

## State-of-the-art planet atmospheres you can realistically ship
There are two “production-grade” lineages that matter most for your constraints (procedural planets, arbitrary camera altitude, WebGPU budgets): **Bruneton-style precomputed scattering** and the newer **Hillaire scalable LUT-driven ray marching** approach.

### Bruneton-style precomputed scattering (2008 → modernized 2017)
The canonical reference is the “Precomputed Atmospheric Scattering” family by entity["people","Eric Bruneton","inria computer graphics"] and entity["people","Fabrice Neyret","inria computer graphics"], which precomputes expensive scattering integrals into LUTs so runtime shading is just lookup + composition. The 2017 “new implementation” is important because it explicitly addresses reuse and correctness problems of earlier code (documentation, tests, and Earth-specific texture-coordinate hacks). citeturn2view6turn11view1

Key “research-grade” strengths for your use case:
- **Planet-agnostic parameterization**: the 2017 writeup calls out removing ad-hoc Earth constants in mapping functions and improving coordinate mapping so it can be reused for other planets. citeturn2view6  
- **Spectral sanity + ozone**: the new implementation adds ozone support and discusses moving away from unphysical constants, including configurable solar spectrum and converting radiance properly (rather than displaying raw radiance directly). citeturn2view6  
- **A known-good baseline**: it’s widely used as a comparison/reference implementation, including being copied (with authorization) into later research/production comparisons. citeturn11view0

A practical (and telling) cross-check is that entity["company","Unity","game engine company"]’s HDRP “Physically Based Sky” documentation explicitly states their implementation is a practical implementation of **Bruneton & Neyret (2008)** as well as **Hillaire (2020)**—and it mentions exponential density falloff and an ozone layer model. citeturn16view1

### Hillaire’s scalable, production-ready sky & atmosphere (EGSR 2020)
EGSR 2020 (“A Scalable and Production Ready Sky and Atmosphere Rendering Technique”) positions itself as physically-based, ground-to-space, cheap to compute, and notably avoiding “high dimensional LUTs,” plus introducing a real-time multiple scattering approximation. citeturn4view0turn0search9

The most implementation-relevant details (from the SIGGRAPH 2020 slides describing the Unreal Engine implementation) are:
- **Low-res LUT strategy** that preserves high-frequency horizon behavior while decoupling cost from final screen resolution (explicitly motivated by sky/aerial perspective smoothness except near horizon and shadows). citeturn6view0turn6view1  
- A set of LUTs including:
  - **Transmittance LUT** (same concept as Bruneton) storing colored transmittance from a point to top-of-atmosphere to avoid secondary ray marching for every query. citeturn6view2  
  - **Sky-View LUT**: lat/long mapped, with a **non-linear latitude mapping** specifically to preserve horizon detail and reduce interpolation artifacts; it can accumulate **multiple suns**. citeturn6view3  
  - **Aerial perspective volume (“froxel” LUT)** mapped to the camera frustum; RGB stores luminance reaching the camera from the froxel center and alpha stores transmittance from camera to froxel center, applied to opaque/translucent surfaces. citeturn6view1turn6view3  
  - A **multiple scattering LUT**, with known caveats when you push anisotropy hard (it can drift/diverge as phase becomes strongly anisotropic). citeturn6view4  
- Scalability knobs: LUT resolution + ray-march sample count controls, and sample count adjusted based on distance. citeturn6view0turn6view2

The most valuable “developer asset” for you is that the author also published a companion project that compares the technique to Bruneton-style LUTs and to a real-time path tracer. The README states it accompanies the EGSR 2020 paper and that the technique is used to render sky and atmosphere in Unreal Engine. citeturn11view0

### Why this matters for WebGPU + huge procedural planets
For browser constraints, Hillaire’s approach is attractive because it’s explicitly built around **decoupling atmosphere cost from resolution** and using smaller LUTs without the high-dimensional update cost and horizon artifacts that earlier LUT approaches can exhibit. citeturn4view0turn6view0turn6view3  
But in practice, the “best ship path” is often hybrid: reuse the Bruneton-style **transmittance** foundations and spectral/ozone rigor, while adopting the Hillaire-style **Sky-View + froxel aerial perspective + multi-scattering approximation** pipeline. That hybridization is consistent with how HDRP frames its physically based sky (it references both). citeturn16view1turn6view2

## Volumetric clouds that actually match the atmosphere
Realistic clouds are not just “3D noise raymarch.” They must:
- Match time-of-day and atmospheric color shifts (sunset redness, aerial perspective attenuation).
- Cast believable volumetric shadows and self-shadow.
- Preserve art direction (coverage, type, storm structure), ideally driven by your procedural world simulation.

The most production-relevant public lineage here is entity["company","Guerrilla Games","game studio, amsterdam, nl"]’s Nubis work for entity["video_game","Horizon Zero Dawn","2017 action rpg"], because it’s designed for evolving skies, weather-driven control, and strict frame budgets.

### Nubis (2015) “2.5D” volumetric cloudscapes: weather control + optimized raymarch
In the 2015 Advances in Real-Time Rendering slides, the system uses a weather output map where **R=coverage, G=precipitation, B=cloud type**, and the weather simulation modulates these over gameplay while preserving art-directability. citeturn10view0turn10view7

Modeling details that matter for a browser port:
- They follow a “standard ray-march/sampler framework,” but explicitly build clouds with **two LOD layers**: *low-frequency base shape* + *high-frequency detail/distortion*. citeturn10view0  
- Noise compression strategy: they reduce memory and bandwidth by using **two 3D textures and one 2D texture**, with concrete example resolutions: a 128³ 3D texture (Perlin–Worley + Worley channels) for base shape, a 32³ 3D texture for detail Worley, and a 128² 2D curl noise for turbulence/distortion. citeturn10view4turn10view6  
- Time-of-day integration: they explicitly discuss that lighting/colors update automatically with time-of-day and that the approach avoids prebaking, while keeping “unique memory usage” to those small noise textures rather than many billboards/skydomes. citeturn10view6  
- There’s evidence of very practical GPU thinking: e.g., a mention of a faster shader variant once alpha crosses a threshold, producing a ~2× speedup in that context. citeturn10view6

This is the “sweet spot” starting point for WebGPU: **procedural + art-directable + noise-texture-driven**, and it can be implemented as a spherical shell around your planet.

### Nubis evolved and Nubis³: moving from 2.5D toward voxel clouds
On Schneider’s site, Nubis is described as producing dynamic volumetric skyboxes rendering in under ~2 ms on PS4 for Horizon Zero Dawn, and later work expands into fly-through clouds and storm systems on newer hardware. citeturn14view0

The Guerrilla “Nubis³” description is especially relevant if you want the “research-grade” edge:
- It describes a **voxel-based cloud renderer** behaving like volumetric skyboxes but supporting time-of-day and high frame rates, including gameplay exploration “in the sky.” citeturn12view0turn14view0  
- It lists solutions that are directly transferable conceptually to your project: **ray march acceleration using compressed signed distance fields**, **up-rez dense voxel data** while avoiding memory bottlenecks, **light sampling acceleration**, and approximations for cloud lighting features like **dark edges** and **inner glow**. citeturn12view0turn14view0  
- It explicitly frames this as a decision to move beyond widely adopted 2.5D methods (including ones introduced in 2015/2017 talks) toward voxel-based benefits. citeturn12view0turn14view0

### Cloud lighting must be coupled to atmosphere lighting
Hillaire’s Unreal slides connect the dots in a way that’s very actionable:
- Clouds are part of the atmosphere and cast volumetric shadows “within the atmosphere.” citeturn2view5  
- Multiple scattering is required for clouds because high-albedo media can bounce light many times; without it, clouds read like smoke. citeturn2view5  
- For volumetric shadows, a “Beer shadow map” approach is presented and motivated as a good match for spatially varying density and lower footprint than alternatives; it can be stored in LUTs or traced per-pixel with jitter + TAA depending on budget. citeturn6view2turn6view3  
- They note that evaluating atmospheric transmittance **per step** during cloud integration produces a more complex, realistic sunset look (versus a single transmittance approximation). citeturn6view2turn6view0

Put bluntly: “real” comes from **consistent extinction/transmittance math across sky → haze → clouds**, and from **shadow coherence** (clouds shadow the world, and also shadow/occlude the atmosphere itself). citeturn6view2turn2view5

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Horizon Zero Dawn volumetric clouds screenshot","volumetric cloud ray marching diagram","Perlin Worley noise cloud texture visualization","cloud shadow god rays volumetric"],"num_per_query":1}

## A WebGPU-friendly rendering architecture that matches modern engines
The goal is to turn the above into a pipeline that fits a Babylon.js WebGPU renderer without fighting the engine every frame.

### A modern “production sky” pass graph
A high-level pass layout that maps cleanly to WebGPU (render passes + compute passes) is:

1) **Transmittance LUT pass** (2D texture)  
2) **Multiple scattering LUT pass** (typically 2D texture)  
3) **Sky-View LUT pass** (2D texture, lat/long + non-linear latitude mapping for horizon)  
4) **Aerial Perspective froxel pass** (3D texture in camera frustum space)  
5) Main scene forward/deferred passes  
6) Atmosphere composition:  
   - Sample/apply aerial perspective to surfaces (fog/haze + in-scatter + transmittance)  
   - Render sky from Sky-View LUT + sun disk  
7) **Volumetric cloud pass** (often quarter/half res + temporal accumulation), composited with correct depth/atmosphere coupling

This structure is directly aligned with the Unreal slides: low-res LUT construction, sky-view LUT mapping, froxel volume for aerial perspective, and scalability through LUT resolution and sample count. citeturn6view0turn6view3turn6view1

### Why compute shaders are a great fit for LUT building in WebGPU
In WebGPU/WGSL, LUT building is naturally implemented using compute shaders that write into storage textures:
- WGSL defines storage texture types (write-only / read-only / read-write) specifically for per-texel direct access without samplers. citeturn7search26  
- A practical explanation of storage textures (create a texture with `STORAGE_BINDING`, then write to it) is covered in WebGPU Fundamentals. citeturn7search23  
- Compute shaders operate by writing results to storage buffers/textures in bind groups, matching LUT generation needs. citeturn7search7turn7search30  

That said, you can also build LUTs with fullscreen fragment passes into render targets if Babylon integration is simpler (especially early prototypes).

### Babylon.js-specific shader integration patterns (WGSL)
Even though some Babylon documentation pages are hard to scrape in-text, there are still clear, public integration patterns:

- **WGSL shaders can be registered and used via ShaderStore + ShaderMaterial**, as shown by community WGSL libraries and examples: store WGSL in `ShaderStore.ShaderStoreWGSL`, then construct a `ShaderMaterial` with `shaderLanguage: WGSL`. citeturn7search2turn7search0turn7search6  
- **Node Material can generate WGSL**: the Babylon documentation repo explicitly states you can set `shaderLanguage` to `BABYLON.ShaderLanguage.WGSL` so it generates WebGPU-native WGSL “without needing to cross-compile them from GLSL to WGSL.” citeturn9view0  
- Babylon’s broader positioning includes “transparent WebGL/WebGPU support” and tooling for advanced pipeline control (Node Render Graph mentioned on their specifications page/site). citeturn7search18turn7search21  

A key realism/engineering note: **don’t plan on “injecting a little WGSL” into existing Babylon materials** and calling it done. A Babylon forum thread highlights that injecting WGSL into existing shaders via plugin-like code injection isn’t “reasonably possible” in some setups, pushing you toward explicit custom passes/materials. citeturn0search4

### Practical Babylon strategy for your atmosphere + clouds
A robust approach for a large, evolving procedural game is:

- Treat atmosphere/cloud rendering as a **system-level render feature** (custom render targets + passes), not as “just a material.”
- Own the LUT textures explicitly:
  - `transmittanceLUT: Texture2D`
  - `multiScattLUT: Texture2D`
  - `skyViewLUT: Texture2D`
  - `aerialPerspectiveLUT: Texture3D` (froxel grid)
- Update policy:
  - Recompute expensive LUTs **only when parameters change** (planet radius, density profile, composition, ozone settings), and recompute the cheaper view-dependent LUTs per-frame or as-needed.
  - This matches how HDRP describes “world vs camera mode” precomputation tradeoffs (world mode can be more scene-agnostic, camera mode smaller/faster but needs recompute when lights move). citeturn16view1  

## Handling “bigger than Earth” and cosmic scale without precision collapse
Planet-scale rendering is where atmosphere work often fails for non-visual reasons: **precision jitter, depth fighting, and coordinate overflows**.

### Floating origin (camera-relative world) is essentially mandatory
A “floating origin” keeps the camera near (0,0,0) and shifts the world instead of moving the camera deep into huge coordinates. A formal description of the technique is summarized in the floating origin literature and is explicitly motivated by avoiding precision loss far from origin. citeturn1search3turn1search41

If you plan to render planet-scale space-to-ground seamlessly, you’ll almost certainly combine:
- Floating origin / origin rebasing for visual stability. citeturn1search3turn1search41  
- A high-precision coordinate scheme on CPU (and sometimes in shaders) for orbital mechanics. (In AAA engines, this is commonly solved by double precision or emulated double precision.)

As a relevant data point, Epic documents “Large World Coordinates” using a “DoubleFloat” library that emulates double precision using pairs of 32-bit floats. citeturn1search23

### Atmosphere math wants planet-centric coordinates—so split spaces cleanly
The cleanest mental model is:
- **Simulation space** (planet-centric, high precision) decides camera altitude above sea level, sun direction, planet radius, atmosphere thickness.
- **Render space** (camera-relative) is where you execute ray/sphere intersections and ray marching.

This avoids “the atmosphere shell jitters” problems when the planet center is far from the float origin.

### Scalable sampling: don’t brute force clouds at full res
Hillaire’s slides emphasize scalability via LUT resolution and sample count, and also calls out that full cloud rendering isn’t realistically achievable on low-end mobile—meaning you should design quality tiers from the start for browser portability. citeturn6view0turn2view5

For Nubis-style clouds, the 2015 material demonstrates the production pattern: compact noises, two-frequency structure, and weather-driven macro control—i.e., preserve detail by **structure**, not resolution. citeturn10view4turn10view0

## A production-grade “build path” that converges on photoreal in WebGPU
This is the sequencing that minimizes wasted effort while keeping your end goal (indistinguishable realism) in sight.

First, lock a clear-sky that is correct from ground to space:
- Implement transmittance LUT + Sky-View LUT with proper horizon mapping and sun disk composition, following Hillaire’s Sky-View description (lat/long + non-linear latitude mapping). citeturn6view3turn6view2  
- Validate with the EGSR 2020 companion project logic and/or compare with a reference path tracer approach (the public companion project explicitly supports comparisons against Bruneton and a real-time path tracer). citeturn11view0  

Then, add aerial perspective as a first-class lighting term:
- Implement the froxel aerial perspective volume and apply it to terrain/objects consistently (RGB luminance + alpha transmittance as described). citeturn6view1turn6view3  
- Don’t treat this as “fog.” It’s an integrated part of “real sky” perception. citeturn2view5turn6view1  

Next, add clouds with Nubis-like structure (2.5D first, voxel later if you truly need it):
- Start with a spherical cloud shell around the planet and a **coverage/type/precipitation** weather map like Nubis, combined with base/detail 3D noises and curl distortion. citeturn10view0turn10view4  
- Make the cloud shader couple to the atmosphere by applying atmospheric transmittance and aerial perspective over the accumulated cloud depth (the 2015 slides explicitly talk about attenuating cloud lighting toward atmosphere color over depth and supporting time-of-day without prebake). citeturn10view6  

Finally, bring in the “AAA reads as real” features:
- Volumetric shadows (Beer shadow map or equivalent), and decide whether you store shadows in LUTs or trace per-pixel with jitter + temporal accumulation depending on budget. citeturn6view2turn6view3  
- Multiple scattering approximations tuned for clouds (and accept that phase anisotropy can destabilize certain multi-scattering LUT approximations). citeturn2view5turn6view4  
- If/when 2.5D becomes insufficient (fly-through clouds, voxel storms, very close cinematics), study the Nubis³ direction: compressed-SDF raymarch acceleration, voxel up-rez without memory bottlenecks, light sampling acceleration, and targeted artistic approximations (dark edges, inner glow). citeturn12view0turn14view0  

The reason this path works is that it mirrors how real engines publicly describe the problem: HDRP explicitly frames physically based sky as precomputed scattering, exponential density atmosphere + ozone, and time-of-day changes without performance collapse; Hillaire’s pipeline makes atmosphere scalable with LUTs and frustum volumes; Nubis demonstrates art-directable volumetric clouds backed by weather maps and compact noise textures. citeturn16view1turn6view0turn10view0turn10view4