# Babylon.js WGSL Quick Reference

## PostProcess Constructor Parameter Map (Babylon.js v7+)

Position 0-15, indexed from 0:

| Pos | Name | Type | Notes |
|-----|------|------|-------|
| 0 | name | string | PostProcess instance name |
| 1 | fragmentUrl | string | Shader store key (without "FragmentShader" suffix) |
| 2 | parameters | string[] | Uniform names array |
| 3 | samplers | string[] | Texture sampler names array |
| 4 | options | number | Render ratio (1.0 = full res) |
| 5 | camera | Camera | Target camera |
| 6 | samplingMode | number | e.g. `Texture.BILINEAR_SAMPLINGMODE` |
| 7 | engine | Engine | Engine instance |
| 8 | reusable | boolean | Reuse render target |
| 9 | defines | string | Shader defines |
| 10 | textureType | number | e.g. `Constants.TEXTURETYPE_HALF_FLOAT` |
| 11 | vertexUrl | string | Custom vertex shader key |
| 12 | indexParameters | any | Index parameters |
| **13** | **blockCompilation** | **boolean** | **⚠️ NOT shaderLanguage!** |
| 14 | textureFormat | number | e.g. `Constants.TEXTUREFORMAT_RGBA` |
| **15** | **shaderLanguage** | **ShaderLanguage** | **1 = WGSL, 0 = GLSL** |

> **CRITICAL**: Position 13 is `blockCompilation`. If you pass `true` here thinking it's the WGSL flag, the shader will NEVER compile and the screen will render black with zero errors.

## Blendable Texture Formats (WebGPU)

| Format | Blendable? | Use case |
|--------|-----------|----------|
| `rgba8unorm` | ✅ Yes | Standard color |
| `rgba16float` | ✅ Yes | HDR with blending |
| `rgba32float` | ❌ **No** | Compute-only, no blend |

## WGSL Type Mapping (GLSL → WGSL)

| GLSL | WGSL |
|------|------|
| `float` | `f32` |
| `vec2` | `vec2<f32>` |
| `vec3` | `vec3<f32>` |
| `vec4` | `vec4<f32>` |
| `mat4` | `mat4x4<f32>` |
| `int` | `i32` |
| `uint` | `u32` |
| `ivec2` | `vec2<i32>` |
| `uvec3` | `vec3<u32>` |
| `sampler2D` | `texture_2d<f32>` + `sampler` |
| `sampler3D` | `texture_3d<f32>` + `sampler` |
| `samplerCube` | `texture_cube<f32>` + `sampler` |

## WGSL Texture Sampling (equivalents)

```wgsl
// GLSL: texture2D(tex, uv)
textureSample(myTex, mySampler, uv)

// GLSL: textureLod(tex, uv, lod)
textureSampleLevel(myTex, mySampler, uv, lod)

// GLSL: texture(tex3D, uvw) — 3D texture
textureSample(my3DTex, my3DSampler, uvw)

// GLSL: textureSize(tex, 0)
textureDimensions(myTex, 0)
```

## Struct Alignment Rules

```wgsl
// Each struct member is aligned to its own alignment requirement.
// vec4<f32> = 16 bytes aligned
// vec3<f32> = 16 bytes aligned (NOT 12!)
// vec2<f32> = 8 bytes aligned
// f32       = 4 bytes aligned
// mat4x4    = 64 bytes (4 × vec4)

// WRONG: wasted space and misalignment
struct Bad {
    a: f32,      // offset 0, size 4
    b: vec3<f32>, // offset 16 (padded!), size 12+4pad = 16
    c: f32,      // offset 32
}; // total: 48 bytes with hidden padding

// BETTER: pack scalars together
struct Good {
    b: vec3<f32>, // offset 0, size 16
    a: f32,       // offset 12 (fits in vec3 padding!)
    c: f32,       // offset 16
}; // total: 32 bytes
```

## Common Error Messages and Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| `unresolved value 'myVar'` | Missing `uniforms.` prefix | Use `uniforms.myVar` |
| `texture_2d<f32> cannot be used as struct member` | Texture declared with `uniform` | Use `var` instead |
| `'target' is a reserved keyword` | Used WGSL reserved word as variable | Rename variable |
| `resource variables require @group and @binding` | Bare `var` without Babylon preprocessing | Let Babylon inject bindings; use correct declaration syntax |
| `Blending is enabled but color format not blendable` | `rgba32float` with blending | Use `rgba16float` |
| `Sampler "X" not found in material context` | Sampler name doesn't match convention | Use `<textureName>Sampler` convention |
| `numBindings mismatch` | Shader declares sampler but no value bound | Call `effect.setTexture()` for every declared sampler |
| Screen goes black, no errors | `blockCompilation = true` at param 13 | Check PostProcess constructor param order |
