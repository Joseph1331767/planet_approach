// cloudShaders.ts
// Contains WGSL compute shaders for procedurally generating 3D Noises and Weather Maps.

export const noiseCommonWGSL = `
fn hash33(p3: vec3<f32>) -> vec3<f32> {
    var p = fract(p3 * vec3<f32>(0.1031, 0.1030, 0.0973));
    p += vec3<f32>(dot(p, p.yxz + vec3<f32>(33.33)));
    return fract((p.xxy + p.yxx) * p.zyx);
}

fn hash31(p3: vec3<f32>) -> f32 {
    var p = fract(p3 * vec3<f32>(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

// 3D Value Noise
fn valueNoise(x: vec3<f32>) -> f32 {
    let p = floor(x);
    let f = fract(x);
    let f2 = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(
            mix(hash31(p + vec3<f32>(0.0, 0.0, 0.0)), hash31(p + vec3<f32>(1.0, 0.0, 0.0)), f2.x),
            mix(hash31(p + vec3<f32>(0.0, 1.0, 0.0)), hash31(p + vec3<f32>(1.0, 1.0, 0.0)), f2.x),
            f2.y
        ),
        mix(
            mix(hash31(p + vec3<f32>(0.0, 0.0, 1.0)), hash31(p + vec3<f32>(1.0, 0.0, 1.0)), f2.x),
            mix(hash31(p + vec3<f32>(0.0, 1.0, 1.0)), hash31(p + vec3<f32>(1.0, 1.0, 1.0)), f2.x),
            f2.y
        ),
        f2.z
    );
}

// Math helpers
fn mod3(x: vec3<f32>, y: vec3<f32>) -> vec3<f32> {
    return x - y * floor(x / y);
}

// 3D Worley Noise (Cellular)
fn worleyNoise(x: vec3<f32>, n: f32) -> f32 {
    let p = floor(x);
    let f = fract(x);
    var d = 1.0;

    let vn = vec3<f32>(n);

    for (var k = -1; k <= 1; k++) {
        for (var j = -1; j <= 1; j++) {
            for (var i = -1; i <= 1; i++) {
                let b = vec3<f32>(f32(i), f32(j), f32(k));
                // Tile wrap hash
                let wrappedP = mod3(p + b, vn);
                let r = hash33(wrappedP);
                var diff = b + r - f;
                d = min(d, dot(diff, diff));
            }
        }
    }
    return clamp(sqrt(d), 0.0, 1.0);
}

// FBM Perlin
fn fbmPerlin(x: vec3<f32>, octaves: i32) -> f32 {
    var v = 0.0;
    var a = 0.5;
    var p = x;
    for (var i = 0; i < octaves; i++) {
        v += a * valueNoise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

// FBM Worley (inverted so 1 is cloud, 0 is empty)
fn fbmWorley(x: vec3<f32>, n: f32, octaves: i32) -> f32 {
    var v = 0.0;
    var a = 0.5;
    var p = x;
    var currentN = n;
    for (var i = 0; i < octaves; i++) {
        v += a * (1.0 - worleyNoise(p, currentN));
        p *= 2.0;
        currentN *= 2.0;
        a *= 0.5;
    }
    return v;
}

// Remap value x from [a,b] to [c,d]
fn remap(x: f32, a: f32, b: f32, c: f32, d: f32) -> f32 {
    return clamp(((x - a) / (b - a)) * (d - c) + c, min(c,d), max(c,d));
}
`;

export const noiseBaseComputeWGSL = `
#include<noise_common>

@group(0) @binding(0) var dest: texture_storage_3d<rgba8unorm, write>;

// Generates the 128^3 Base Noise (Perlin-Worley)
// R: Perlin-Worley, G: Worley FBM (freq 2), B: Worley FBM (freq 4), A: Worley FBM (freq 8)
@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let resolution = 128.0;
    if (f32(global_id.x) >= resolution || f32(global_id.y) >= resolution || f32(global_id.z) >= resolution) {
        return;
    }
    
    let uvw = vec3<f32>(global_id) / resolution;
    let freq = 4.0;
    let p = uvw * freq;
    
    // Perlin FBM
    let perlin = fbmPerlin(p, 7);
    
    // Worley FBMs (Base)
    let worleyBase = fbmWorley(p, freq, 3);
    
    // Combine to get Perlin-Worley
    let perlinWorley = remap(perlin, 0.0, 1.0, worleyBase, 1.0);
    
    // Detail Worleys
    let w1 = fbmWorley(p * 2.0, freq * 2.0, 3);
    let w2 = fbmWorley(p * 4.0, freq * 4.0, 3);
    let w3 = fbmWorley(p * 8.0, freq * 8.0, 3);
    
    textureStore(dest, vec3<i32>(global_id), vec4<f32>(perlinWorley, w1, w2, w3));
}
`;

export const noiseDetailComputeWGSL = `
#include<noise_common>

@group(0) @binding(0) var dest: texture_storage_3d<rgba8unorm, write>;

// Generates the 32^3 Detail Noise (Worley FBM)
// R, G, B are Worley at increasing frequencies
@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let resolution = 32.0;
    if (f32(global_id.x) >= resolution || f32(global_id.y) >= resolution || f32(global_id.z) >= resolution) {
        return;
    }
    
    let uvw = vec3<f32>(global_id) / resolution;
    let freq = 2.0;
    let p = uvw * freq;
    
    let w1 = fbmWorley(p, freq, 3);
    let w2 = fbmWorley(p * 2.0, freq * 2.0, 3);
    let w3 = fbmWorley(p * 4.0, freq * 4.0, 3);
    
    textureStore(dest, vec3<i32>(global_id), vec4<f32>(w1, w2, w3, 1.0));
}
`;

export const weatherMapComputeWGSL = `
#include<noise_common>

@group(0) @binding(0) var dest: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let resolution = vec2<f32>(1024.0, 1024.0);
    if (f32(global_id.x) >= resolution.x || f32(global_id.y) >= resolution.y) {
        return;
    }
    
    let uv = vec2<f32>(global_id.xy) / resolution;
    
    // Map 2D texture coordinates to pure spherical 3D spatial orientations 
    // to guarantee flawlessly seamless Equirectangular Planet Projections
    // PI = 3.14159265
    let phi = uv.x * 3.14159265 * 2.0;
    let theta = uv.y * 3.14159265;
    
    let sphericalP = vec3<f32>(
        sin(theta) * cos(phi),
        cos(theta),
        sin(theta) * sin(phi)
    );
    
    // Scale for continental-sized weather wrapping the planet bounds
    let p = sphericalP * 4.0;
    
    // Coverage
    let coverage = max(0.0, fbmPerlin(p, 6) * 1.5 - 0.2);
    
    // Precipitation (higher probability where coverage is high)
    let precip = max(0.0, fbmPerlin(p * 2.0 + vec3<f32>(13.3, 11.2, 0.0), 4) * 1.5 - 0.5) * coverage;
    
    // Cloud Type (0 = stratus, 0.5 = stratocumulus, 1.0 = cumulonimbus)
    let cloudType = fbmPerlin(p * 0.5 + vec3<f32>(5.4, 2.1, 0.0), 3);
    
    textureStore(dest, vec2<i32>(global_id.xy), vec4<f32>(coverage, precip, cloudType, 1.0));
}
`;
