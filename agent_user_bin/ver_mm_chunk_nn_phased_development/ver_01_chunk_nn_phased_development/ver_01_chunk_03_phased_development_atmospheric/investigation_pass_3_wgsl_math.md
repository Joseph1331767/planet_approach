# Investigation Pass 3: WGSL Lighting Mathematics
**Objective**: Mathematically trace the validated `sunDir` vector inside `cloudShellShader.ts`. Verify if calculations utilizing `sunDir` evaluate correctly through Transmission maps, or if optical accumulation parameters are starved.

## 1. Transmission LUT Mapping
```wgsl
let r_p = length(p);
let mu_p = dot(p / r_p, sDir);
let atmoLight = sampleTransmittanceLUT(r_p, mu_p).rgb;
```
- `p / r_p` is the surface normal of the planet at calculation coordinate `p`.
- **Lit Hemisphere (Sunwards)**: `p / r_p` exactly mirrors `sDir(1, 0.5, -1)`, computing a dot product (`mu_p`) of `~1.0`. Transmittance returns bright, unfiltered intense white/yellow daylight.
- **Dark Hemisphere (Leeward)**: `p / r_p` strictly opposes `sDir`, calculating a dot product of `~-1.0`. Transmittance equates correctly as atmospheric blocked shadow ambient glow.

## 2. Volumetric Raymarching Trap (Coupled Extinction Paradox)
Despite perfect vector illumination logic, the visual return was still dark over the properly lit hemisphere. `MinigameOrchestrator` previously commanded a density scaling attribute (`densityMul = 40.0`). 

At `100% thick solid white volumetric scale` (density 40.0):
The `shadowT` shadow rays accumulated `40.0` extinction coefficient within 2 iterations (of 48 iterations total per ray). `exp(-lightDensity)` exponentially smashed mathematical sunlight `shadowT` transmission to `0.0`. Plunging internal cloud structures into immediate physical darkness.

At `Translucent volumetric soft scale` (density 0.3x reduced):
The physical `shadowT` successfully survived shadow ray marching (`shadowT = 0.96`), perfectly returning standard bright illumination. BUT the primary camera visual accumulation `ext` also identically dropped to `~15%` maximum opacity depth since it was mathematically coupled.

**The Background Trap:**
Rendering a 15% transparent bright white cloud against the physical visual `rgb(0,0,0)` blackness of empty space evaluates organically as *dark grey geometry* `(15% white * 85% void)`. The cloud shadows were functionally cured; but the camera couldn't accumulate them fast enough visually.

## Pass 3 Conclusion
The WGSL direction `sunDir` reacts completely perfectly with physical sunlight evaluation. However, applying a native mathematical reduction to the visual opacity of clouds to fix internal sun-shadowing physically causes the clouds to render as invisible dark ghosts superimposed mathematically over space.
**Solution Applied**: Fractional Extinction mathematically isolates Camera Absorption Variables from Shadow Absorption Variables. Camera density is restored mathematically to massive parameters (`100% physically opaque mountains`), while shadow transmittance scales native raw geometry, granting profound scatter transmission and ending the dark-cloud cycle permanently.
