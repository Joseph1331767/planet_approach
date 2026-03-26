---
name: babylon-wgsl-shaders
description: How to write WGSL shaders for Babylon.js WebGPU engine - ShaderMaterial, PostProcess, ComputeShader patterns, binding rules, and common pitfalls.
---

# Babylon.js WGSL Shader Authoring Skill

Use this skill whenever writing WGSL shader code that runs inside Babylon.js's WebGPU engine. This covers ShaderMaterial, PostProcess, and ComputeShader patterns.

## Critical Rules (MUST follow)

### 1. NEVER add `@group(X) @binding(Y)` decorations
Babylon.js auto-assigns all bindings. Manual decorations will conflict and cause validation errors.

### 2. Uniform access pattern
When you declare `uniform varName : varType;`, you MUST access it as **`uniforms.varName`** in the shader body — NOT as plain `varName`.

```wgsl
// Declaration
uniform myFloat : f32;
uniform myVec : vec3<f32>;

// Usage - CORRECT
let x = uniforms.myFloat;
let v = uniforms.myVec;

// Usage - WRONG (will cause "unresolved value" error)
let x = myFloat;     // ❌
let v = myVec;        // ❌
```

### 3. Entry point signatures

**Vertex shader:**
```wgsl
@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>(vertexInputs.position, 1.0);
}
```

**Fragment shader (ShaderMaterial):**
```wgsl
@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    fragmentOutputs.color = vec4<f32>(1.0, 0.0, 0.0, 1.0);
}
```

> **WARNING**: Even though the parameter is named `input`, do NOT access variables through `input.XXX`. Always use `vertexInputs.XXX` or `fragmentInputs.XXX`. The engine applies transformations (e.g., integer-to-float conversion) that `input.XXX` would bypass.

### 4. Input/Output variable mapping (GLSL → WGSL)

| GLSL | WGSL (Vertex) | WGSL (Fragment) |
|------|---------------|-----------------|
| attribute | `vertexInputs.attrName` | — |
| gl_VertexID | `vertexInputs.vertexIndex` | — |
| gl_InstanceID | `vertexInputs.instanceIndex` | — |
| varying (write) | `vertexOutputs.varName` | — |
| gl_Position | `vertexOutputs.position` | — |
| varying (read) | — | `fragmentInputs.varName` |
| gl_FragCoord | — | `fragmentInputs.position` |
| gl_FrontFacing | — | `fragmentInputs.frontFacing` |
| gl_FragColor | — | `fragmentOutputs.color` |
| gl_FragDepth | — | `fragmentOutputs.fragDepth` |

### 5. Variable declarations use GLSL-like syntax, WGSL types

```wgsl
varying vUV : vec2<f32>;        // NOT vec2, must be vec2<f32>
attribute position : vec3<f32>;
uniform myColor : vec4<f32>;
```

### 6. Texture and sampler declarations

For textures/samplers in ShaderMaterial, use `var` (NOT `uniform`):
```wgsl
var myTexture : texture_2d<f32>;
var mySampler : sampler;
// 3D textures
var my3DTex : texture_3d<f32>;
// Storage textures
var storageTexture : texture_storage_2d<rgba8unorm,write>;
```

### 7. Shader Store registration

WGSL shaders go in `ShadersStoreWGSL`, NOT `ShadersStore`:
```typescript
// WGSL
BABYLON.ShaderStore.ShadersStoreWGSL["myShaderVertexShader"] = `...`;
BABYLON.ShaderStore.ShadersStoreWGSL["myShaderFragmentShader"] = `...`;

// GLSL (auto-transpiled to WGSL by Babylon)
BABYLON.Effect.ShadersStore["myShaderFragmentShader"] = `...`;
```

### 8. ShaderMaterial constructor for WGSL

```typescript
const mat = new BABYLON.ShaderMaterial("shader", scene, {
    vertex: "myShader",
    fragment: "myShader",
}, {
    attributes: ["position", "uv", "normal"],
    uniformBuffers: ["Scene", "Mesh"],
    shaderLanguage: BABYLON.ShaderLanguage.WGSL,
});
```

### 9. Pre-defined uniform access

Include these for scene/mesh uniforms:
```wgsl
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
```
Then access as `scene.viewProjection`, `scene.vEyePosition`, `mesh.world`, `mesh.visibility`.

### 10. NDC z-range difference
- GLSL (WebGL): z ∈ [-1.0, 1.0]
- WGSL (WebGPU): z ∈ [0.0, 1.0]

## ComputeShader Patterns

Compute shaders use **ordinary WGSL** (not the special ShaderMaterial syntax):

```wgsl
@group(0) @binding(0) var dest : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    textureStore(dest, vec2<i32>(global_id.xy), vec4<f32>(1.0, 0.0, 0.0, 1.0));
}
```

For compute shaders, register in `ShadersStoreWGSL` with key `"<name>ComputeShader"`.

```typescript
ShaderStore.ShadersStoreWGSL["myComputeComputeShader"] = wgslCode;
const cs = new ComputeShader("myCompute", engine, "myCompute", {
    bindingsMapping: { "dest": { group: 0, binding: 0 } }
});
```

## PostProcess Patterns

### Option A: GLSL PostProcess (Recommended for simplicity)
Babylon auto-transpiles GLSL to WGSL. This is the safest path:

```typescript
Effect.ShadersStore["myEffectFragmentShader"] = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform float myParam;
    void main(void) {
        vec4 color = texture2D(textureSampler, vUV);
        gl_FragColor = color * myParam;
    }
`;

const pp = new PostProcess("myEffect", "myEffect",
    ["myParam"],  // uniforms
    null,         // samplers
    1.0, camera
);
pp.onApply = (effect) => {
    effect.setFloat("myParam", 1.0);
};
```

### Option B: WGSL PostProcess (Advanced)
For native WGSL PostProcess, you MUST:
1. Register in `ShadersStoreWGSL` with key `"<name>FragmentShader"`
2. Use `uniforms.varName` for all uniform access
3. Use `fragmentOutputs.color` for output
4. Pass `shaderLanguage: ShaderLanguage.WGSL` (parameter index 15 in constructor)
5. Textures use `var` declarations, NOT `uniform`

```typescript
ShaderStore.ShadersStoreWGSL["myEffectFragmentShader"] = `
    varying vUV : vec2<f32>;
    var textureSampler : texture_2d<f32>;
    var textureSamplerSampler : sampler;
    uniform myParam : f32;

    @fragment
    fn main(input : FragmentInputs) -> FragmentOutputs {
        let color = textureSample(textureSampler, textureSamplerSampler, fragmentInputs.vUV);
        fragmentOutputs.color = color * uniforms.myParam;
    }
`;

const pp = new PostProcess("myEffect", "myEffect",
    ["myParam"], null, 1.0, camera,
    Texture.BILINEAR_SAMPLINGMODE, engine,
    false, null, Constants.TEXTURETYPE_UNSIGNED_BYTE,
    undefined, undefined, false, undefined,
    ShaderLanguage.WGSL  // Position 15!
);
```

## WebGPU Breaking Changes Checklist

- [ ] Texture arrays: use immediate indices only (`myTex[0]`), NOT variable indices (`myTex[i]`)
- [ ] Samplers: CANNOT be passed as function arguments. Use `#define inline` to force inlining
- [ ] All sampler uniforms MUST have bound values (even if unused in current code path)
- [ ] `readPixels` is async — returns a Promise
- [ ] Engine creation is async — use `await engine.initAsync()`
- [ ] Viewport values must be in [0,1] range, x+w ≤ 1, y+h ≤ 1
- [ ] `TEXTUREFORMAT_LUMINANCE` is not supported
- [ ] `rgba32float` format is NOT blendable — use `rgba16float` for blendable float targets
- [ ] Custom attributes MUST be declared in the attributes array (no silent fallbacks)

## WGSL Reserved Keywords to Avoid as Variable Names

`target`, `output`, `input`, `sample`, `module`, `override`, `enable`, `diagnostic`, `requires`, `const_assert`

## Common Pitfalls

1. **PostProcess constructor parameter order**: The 13th param is `blockCompilation`, NOT `shaderLanguage`. `shaderLanguage` is the 15th param. Passing `true` at position 13 silently blocks shader compilation.
2. **Struct uniform members**: Texture/sampler types CANNOT be struct members in WGSL. They must be standalone `var` declarations.
3. **3D texture creation**: Use `engine.createRawTexture3D()` with `TEXTURE_CREATIONFLAG_STORAGE` for compute-writable 3D textures.
4. **16-byte alignment**: All WGSL struct fields must respect 16-byte alignment rules.
