export const cloudUpscaleVertex = `
#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute normal : vec3<f32>;
attribute uv : vec2<f32>;

varying vUV : vec2<f32>;
varying vWorldPos : vec3<f32>;
varying vNormal : vec3<f32>;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    vertexOutputs.vUV = vertexInputs.uv;
    
    let worldPos = mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    vertexOutputs.vWorldPos = worldPos.xyz;
    vertexOutputs.vNormal = (mesh.world * vec4<f32>(vertexInputs.normal, 0.0)).xyz;
    
    vertexOutputs.position = scene.viewProjection * worldPos;
}
`;

export const cloudUpscaleFragment = `
varying vUV : vec2<f32>;
varying vWorldPos : vec3<f32>;
varying vNormal : vec3<f32>;

uniform zoomTier : f32;
uniform focalUV : vec2<f32>;

var atlasMap : texture_2d<f32>;
var atlasMapSampler : sampler;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    // Math to fractional upscale natively calculating sample bounds
    let sampleRadius = 1.0 / pow(2.0, uniforms.zoomTier);
    
    // Evaluate the final coordinate by dropping focal point and radiating
    var finalUV = uniforms.focalUV + (fragmentInputs.vUV - 0.5) * sampleRadius;

    // Wrap X bounds securely cleanly allowing infinite rotation visually
    finalUV.x = fract(finalUV.x);
    if (finalUV.x < 0.0) { finalUV.x += 1.0; }
    
    // Clamp Y to prevent vertical looping visually
    finalUV.y = clamp(finalUV.y, 0.0, 1.0);

    let cloudSample = textureSample(atlasMap, atlasMapSampler, finalUV);
    
    // Produce visually white clouds mapped to the Red mask natively
    fragmentOutputs.color = vec4<f32>(cloudSample.rgb, cloudSample.r);
}
`;
