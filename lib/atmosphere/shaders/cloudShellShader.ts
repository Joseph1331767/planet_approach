// Cloud Shell Shader - WGSL for Babylon.js PostProcess
// Following SKILL.md rules: uniforms.X access, FragmentOutputs struct, var for textures

export const cloudShellWGSL = `
#include<noise_common>

varying vUV : vec2<f32>;

fn raySphereIntersect(r0: vec3<f32>, rd: vec3<f32>, s0: vec3<f32>, sR: f32) -> vec2<f32> {
    let a = dot(rd, rd);
    let s0_r0 = r0 - s0;
    let b = 2.0 * dot(rd, s0_r0);
    let c = dot(s0_r0, s0_r0) - (sR * sR);
    let d = b * b - 4.0 * a * c;
    if (d < 0.0) {
        return vec2<f32>(-1.0, -1.0);
    }
    let sqrtD = sqrt(d);
    return vec2<f32>(
        (-b - sqrtD) / (2.0 * a),
        (-b + sqrtD) / (2.0 * a)
    );
}

var textureSampler : texture_2d<f32>;
var textureSamplerSampler : sampler;
var baseNoiseTex : texture_3d<f32>;
var baseNoiseTexSampler : sampler;
var detailNoiseTex : texture_3d<f32>;
var detailNoiseTexSampler : sampler;
var transmittanceLUT : texture_2d<f32>;
var transmittanceLUTSampler : sampler;
// Bypassed weatherMapTex to prevent BindGroup crash
// var weatherMapTex : texture_2d<f32>;
// var weatherMapTexSampler : sampler;

uniform planetRadius : f32;
uniform cloudBottom : f32;
uniform cloudTop : f32;
uniform coverageAmt : f32;
uniform densityMul : f32;
uniform elapsedTime : f32;
uniform camPos : vec3<f32>;
uniform sunDir : vec3<f32>;
uniform camFwd : vec3<f32>;
uniform camRight : vec3<f32>;
uniform camUp : vec3<f32>;
uniform tanFov : f32;
uniform aspectRatio : f32;

// Transmittance LUT lookup - maps local world scale to physical atmosphere
fn sampleTransmittanceLUT(r_world: f32, mu: f32) -> vec4<f32> {
    let physBot = 6360.0;
    let physTop = 6460.0;
    let r = mix(physBot, physTop, clamp((r_world - uniforms.planetRadius) / 15.0, 0.0, 1.0));
    let H = sqrt(physTop * physTop - physBot * physBot);
    let rho = sqrt(max(0.0, r * r - physBot * physBot));
    let dmin = physTop - r;
    let dmax = rho + H;
    var d: f32;
    // Ray-sphere intersection distance to top of atmosphere.
    // The negative sign on -r * mu is mathematically essential!
    let discriminant = r * r * mu * mu - r * r + physTop * physTop;
    if (discriminant > 0.0) {
        d = max(0.0, -r * mu + sqrt(discriminant));
    } else {
        d = 0.0;
    }
    
    let x_mu = (d - dmin) / (dmax - dmin);
    let x_r = rho / H;
    return textureSampleLevel(transmittanceLUT, transmittanceLUTSampler, vec2<f32>(x_mu, x_r), 0.0);
}

fn getWeather(p: vec3<f32>) -> vec3<f32> {
    // Evaluate procedural weather dynamically through 3D space avoiding polar seams entirely!
    let n = normalize(p);
    
    // Scale for continental-sized weather mapping smoothly across the sphere
    let uvPos = n * 40.0 + vec3<f32>(uniforms.elapsedTime * 0.0005, 0.0, 0.0);
    
    // Coverage using mathematically identical FBM
    let coverage = max(0.0, fbmPerlin(uvPos, 4) * 1.5 - 0.2);
    
    // R = Coverage, G = Precip, B = Type
    return vec3<f32>(clamp(coverage, 0.0, 1.0), 0.5, 0.5);
}

fn getCloudDensity(p: vec3<f32>, weather: vec3<f32>) -> f32 {
    let r = length(p);
    let h = clamp((r - uniforms.cloudBottom) / (uniforms.cloudTop - uniforms.cloudBottom), 0.0, 1.0);
    
    // Cloud profile (anvil-like)
    let heightGrad = smoothstep(0.0, 0.2, h) * smoothstep(1.0, 0.8, h);
    if (heightGrad <= 0.0) { return 0.0; }

    // Apply wind as a spherical rotation matrix instead of a linear scroll.
    let angle = uniforms.elapsedTime * 0.0002;
    let s = sin(angle);
    let c = cos(angle);
    let pRotBase = vec3<f32>(
        p.x * c - p.z * s,
        p.y,
        p.x * s + p.z * c
    );

    let n_dir = normalize(pRotBase);
    let h_scale = 5.0;
    let v_scale = 100.0;
    let altitudeOffset = (r - uniforms.cloudBottom) * v_scale;
    let pAniso = pRotBase * h_scale + n_dir * altitudeOffset;

    let mappedPos = abs(2.0 * fract(pAniso) - 1.0) * 0.98 + 0.01;

    let baseNoise = textureSampleLevel(baseNoiseTex, baseNoiseTexSampler, mappedPos, 0.0);
    
    // Real weather map coverage
    let covScaled = weather.r * uniforms.coverageAmt;
    var density = baseNoise.r - (1.0 - covScaled);

    if (density > 0.0) {
        // Mirrored sampling for detail noise, evaluating decoupled Anisotropic offsets
        let detAniso = pRotBase * (h_scale * 3.5) + n_dir * (altitudeOffset * 3.5);
        let detPos = abs(2.0 * fract(detAniso) - 1.0) * 0.98 + 0.01;
        
        let detNoise = textureSampleLevel(detailNoiseTex, detailNoiseTexSampler, detPos, 0.0).r;
        let erosion = mix(0.1, 0.9, 1.0 - heightGrad);
        density -= detNoise * erosion;
        
        return max(0.0, density * heightGrad); 
    }
    return 0.0;
}

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let sceneColor = textureSample(textureSampler, textureSamplerSampler, fragmentInputs.vUV);

    // Construct ray from camera vectors
    let ro = uniforms.camPos;
    let uvx = fragmentInputs.vUV.x * 2.0 - 1.0;
    let uvy = fragmentInputs.vUV.y * 2.0 - 1.0;
    let rd = normalize(
        uniforms.camFwd
        + uniforms.camRight * uvx * uniforms.tanFov * uniforms.aspectRatio
        + uniforms.camUp * uvy * uniforms.tanFov
    );

    // Intersect Cloud Shell
    let tCloud = raySphereIntersect(ro, rd, vec3<f32>(0.0), uniforms.cloudTop);
    let tGround = raySphereIntersect(ro, rd, vec3<f32>(0.0), uniforms.cloudBottom);

    if (tCloud.x < 0.0 && tCloud.y < 0.0) {
        fragmentOutputs.color = vec4<f32>(sceneColor.rgb, 1.0);
        return fragmentOutputs;
    }

    var dMin = max(0.0, tCloud.x);
    var dMax = tCloud.y;

    if (length(ro) < uniforms.cloudBottom) {
        // Camera is below the clouds
        dMin = max(dMin, tGround.y);
    } else if (length(ro) > uniforms.cloudTop) {
        // Camera is above the clouds
        if (tGround.x > 0.0) {
            dMax = min(dMax, tGround.x);
        }
    } else {
        // Camera is inside the clouds
        if (tGround.x > 0.0) {
            dMax = min(dMax, tGround.x);
        }
    }

    if (dMin >= dMax) {
        fragmentOutputs.color = vec4<f32>(sceneColor.rgb, 1.0);
        return fragmentOutputs;
    }

    let tMin = dMin;
    let tMax = dMax;

    // Raymarch with REAL noise textures
    let numSteps = 48.0;
    let stepSize = (tMax - tMin) / numSteps;
    if (stepSize <= 0.0) {
        fragmentOutputs.color = vec4<f32>(sceneColor.rgb, 1.0);
        return fragmentOutputs;
    }
    
    var cloudAccum = vec3<f32>(0.0);
    var transmittance = 1.0;
        
        // Ray jitter / dithering to break up concentric banding shells (wood-grain artifact)
        let dither = fract(sin(dot(fragmentInputs.vUV * vec2<f32>(uniforms.aspectRatio, 1.0) + uniforms.elapsedTime * 0.01, vec2<f32>(12.9898, 78.233))) * 43758.5453) * stepSize;
        var t = tMin + dither;
    
    let sDir = normalize(uniforms.sunDir);

    for (var i = 0.0; i < 48.0; i += 1.0) {
        let p = ro + rd * t;
        let weather = getWeather(p);
        
        // Acceleration 1: Empty Space Skipping. 
        // If the 2D map declares no storm system here, natively skip the grueling 
        // 3D noise algorithmic texture fetching and shadow looping uniformly.
        if (weather.r < 0.01) {
            t += stepSize;
            continue;
        }

        let density = getCloudDensity(p, weather);

        if (density > 0.01) {
            if (transmittance < 0.01) { break; }
            
            // Decoupled Camera Extinction: The camera sees the clouds scaled by densityMul (e.g. 500.0) 
            // so they quickly accumulate to solid, 100% thick white shapes instead of invisible wisps.
            let ext = density * uniforms.densityMul;
            let dt = exp(-ext * stepSize);
            
            // Basic Beer shadow with stochastic dithering to break planar shadow bands
            var shadowT = 1.0;
            
            // Acceleration 2: Deep Shadow Truncation
            // If the geometric voxel is functionally opaque to the camera, do not evaluate
            // inner-light geometric shadow casting, it is physically redundant mathematically.
            if (transmittance > 0.05) {
                var lightDensity = 0.0;
                let lightStep = (uniforms.cloudTop - uniforms.cloudBottom) * 0.33;
                let shadowDither = fract(dither * 13.567) * lightStep;
                for (var j = 1.0; j <= 3.0; j += 1.0) {
                    let lp = p + sDir * (lightStep * j + shadowDither);
                    if (length(lp) > uniforms.cloudTop) { continue; }
                    let lw = getWeather(lp);
                    if (lw.r < 0.01) { continue; }
                    lightDensity += getCloudDensity(lp, lw);
                }
                
                // Scaled extinction coefficient to offset the squished physical bounds
                shadowT = exp(-lightDensity * lightStep * 15.0);
            } else {
                shadowT = 0.0; // Terminal core darkness
            }
            
            // Atmo light lookup (Transmittance LUT)
            let r_p = length(p);
            let mu_p = dot(p / r_p, sDir);
            var atmoLight = sampleTransmittanceLUT(r_p, mu_p).rgb;

            // Fade out sunlight completely as it approaches the physical Earth shadow boundary
            // This acts as an atmospheric penumbra, preventing the boolean sphere intersection
            // from slicing infinitely sharp razor bands across the sunset terminator.
            let terminatorFade = smoothstep(-0.05, 0.05, mu_p);
            atmoLight *= terminatorFade;

            // Physical Earth Shadow test ensures night side gets 0 direct light
            let planetInt = raySphereIntersect(p, sDir, vec3<f32>(0.0), uniforms.planetRadius);
            if (planetInt.x > 0.0) {
                atmoLight = vec3<f32>(0.0);
            }

            let phase = 0.8;
            let S = atmoLight * shadowT * phase * ext + vec3<f32>(0.01, 0.02, 0.04) * ext;
            let Sint = (S - S * dt) / max(0.0001, ext);
            
            cloudAccum += transmittance * Sint;
            transmittance *= dt;
        }
        t += stepSize;
    }

    let finalColor = cloudAccum + sceneColor.rgb * transmittance;
    fragmentOutputs.color = vec4<f32>(finalColor, 1.0);
}
`;
