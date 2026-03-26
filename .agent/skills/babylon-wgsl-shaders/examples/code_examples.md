# Babylon.js WGSL Code Examples

## Example 1: Working ComputeShader (Noise Generation)

This pattern is proven working in our project for generating 3D noise textures:

```typescript
// Registration
ShaderStore.ShadersStoreWGSL["noiseBaseComputeShader"] = `
@group(0) @binding(0) var dest : texture_storage_3d<rgba8unorm, write>;

fn hash(p: vec3<f32>) -> f32 {
    let q = fract(p * 0.1031);
    // ... hash implementation
    return fract((q.x + q.y) * q.z);
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let coord = vec3<i32>(global_id);
    let uv = vec3<f32>(global_id) / 128.0;
    let noise = hash(uv);
    textureStore(dest, coord, vec4<f32>(noise, noise, noise, 1.0));
}
`;

// Usage
const cs = new ComputeShader("noiseBase", engine, "noiseBase", {
    bindingsMapping: { "dest": { group: 0, binding: 0 } }
});
cs.setStorageTexture("dest", texture);
cs.dispatch(128/4, 128/4, 128/4);
```

## Example 2: Working GLSL PostProcess (Auto-transpiled)

This pattern is proven working for post-processing effects:

```typescript
Effect.ShadersStore["reentryFragmentShader"] = `
    #ifdef GL_ES
    precision highp float;
    #endif

    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform float intensity;
    uniform float altitude;

    void main(void) {
        vec4 color = texture2D(textureSampler, vUV);
        
        float heat = intensity * (1.0 - altitude);
        vec3 glow = vec3(1.0, 0.3, 0.05) * heat;
        
        gl_FragColor = vec4(color.rgb + glow, 1.0);
    }
`;

const pp = new PostProcess("reentry", "reentry",
    ["intensity", "altitude"],
    null,
    1.0,
    camera
);

pp.onApply = (effect) => {
    effect.setFloat("intensity", 0.8);
    effect.setFloat("altitude", 0.5);
};
```

## Example 3: WGSL ShaderMaterial (Full pattern)

```typescript
// Vertex shader
ShaderStore.ShadersStoreWGSL["cloudVertexShader"] = `
    #include<sceneUboDeclaration>
    #include<meshUboDeclaration>

    attribute position : vec3<f32>;
    attribute uv : vec2<f32>;
    varying vUV : vec2<f32>;
    varying vWorldPos : vec3<f32>;

    @vertex
    fn main(input : VertexInputs) -> FragmentInputs {
        let worldPos = mesh.world * vec4<f32>(vertexInputs.position, 1.0);
        vertexOutputs.position = scene.viewProjection * worldPos;
        vertexOutputs.vUV = vertexInputs.uv;
        vertexOutputs.vWorldPos = worldPos.xyz;
    }
`;

// Fragment shader
ShaderStore.ShadersStoreWGSL["cloudFragmentShader"] = `
    varying vUV : vec2<f32>;
    varying vWorldPos : vec3<f32>;
    uniform cloudColor : vec4<f32>;
    uniform density : f32;

    @fragment
    fn main(input : FragmentInputs) -> FragmentOutputs {
        let d = uniforms.density;
        fragmentOutputs.color = uniforms.cloudColor * d;
    }
`;

// Material creation
const mat = new ShaderMaterial("cloud", scene, {
    vertex: "cloud",
    fragment: "cloud",
}, {
    attributes: ["position", "uv"],
    uniformBuffers: ["Scene", "Mesh"],
    shaderLanguage: ShaderLanguage.WGSL,
});

mat.setColor4("cloudColor", new Color4(1, 1, 1, 0.8));
mat.setFloat("density", 0.5);
```

## Example 4: WGSL PostProcess with Textures (Advanced)

```typescript
ShaderStore.ShadersStoreWGSL["cloudShellFragmentShader"] = `
    varying vUV : vec2<f32>;
    
    // Textures - use var, NOT uniform
    var textureSampler : texture_2d<f32>;
    var textureSamplerSampler : sampler;
    var noiseTex : texture_3d<f32>;
    var noiseTexSampler : sampler;
    
    // Scalars - use uniform
    uniform intensity : f32;
    uniform time : f32;
    
    @fragment
    fn main(input : FragmentInputs) -> FragmentOutputs {
        let scene = textureSample(textureSampler, textureSamplerSampler, fragmentInputs.vUV);
        let noise = textureSampleLevel(noiseTex, noiseTexSampler, vec3<f32>(fragmentInputs.vUV, uniforms.time), 0.0);
        fragmentOutputs.color = mix(scene, noise, uniforms.intensity);
    }
`;

const pp = new PostProcess("cloudShell", "cloudShell",
    ["intensity", "time"],          // uniform names
    ["noiseTex"],                    // additional texture samplers
    1.0, camera,
    Texture.BILINEAR_SAMPLINGMODE,
    engine,
    false,                           // reusable
    null,                            // defines
    Constants.TEXTURETYPE_HALF_FLOAT, // blendable float format
    undefined,                       // vertexUrl
    undefined,                       // indexParameters
    false,                           // blockCompilation - NOT shaderLanguage!
    undefined,                       // textureFormat
    ShaderLanguage.WGSL              // position 15!
);

pp.onApply = (effect) => {
    effect.setFloat("intensity", 0.5);
    effect.setFloat("time", performance.now() / 1000);
    effect.setTexture("noiseTex", myNoiseTexture);
};
```
