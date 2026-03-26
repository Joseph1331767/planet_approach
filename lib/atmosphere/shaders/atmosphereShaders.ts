export const atmosphereCommonWGSL = `
// atmosphere_common.wgsl
// Reusable constants, structures, and math for Atmospheric rendering

struct AtmosphereParams {
    rayleighScattering: vec3<f32>,
    padding1: f32,
    mieScattering: f32,
    mieExtinction: f32,
    mieAsymmetry: f32,
    bottomRadius: f32,
    ozoneAbsorption: vec3<f32>,
    topRadius: f32,
};

// EGSR 2020 Ray-Sphere Intersection
// Returns the near and far intersection distances.
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

// Density profile evaluation for a given altitude.
// Rayleigh scale height ~8km, Mie scale height ~1.2km, Ozone is a triangular distribution.
fn getAtmosphereDensities(altitude: f32) -> vec3<f32> {
    // Note: altitude is in arbitrary units (we map 6360km -> 6360.0 units)
    // Scale heights: 8.0 units for Rayleigh, 1.2 units for Mie
    let rayleighDensity = exp(-altitude / 8.0);
    let mieDensity = exp(-altitude / 1.2);
    
    // Ozone is concentrated around 25km altitude
    let ozoneAltitude = 25.0;
    let ozoneWidth = 15.0;
    let ozoneDensity = max(0.0, 1.0 - abs(altitude - ozoneAltitude) / ozoneWidth);
    
    return vec3<f32>(rayleighDensity, mieDensity, ozoneDensity);
}

// Safe distance to atmosphere bounds (planet intersection handling)
fn fetchRayLengths(r0: vec3<f32>, rd: vec3<f32>, bottomRadius: f32, topRadius: f32) -> f32 {
    let tAtmo = raySphereIntersect(r0, rd, vec3<f32>(0.0), topRadius);
    let tGround = raySphereIntersect(r0, rd, vec3<f32>(0.0), bottomRadius);
    
    var d = tAtmo.y; // Far intersection with top of atmosphere
    if (tGround.x > 0.0) {
        d = min(d, tGround.x); // Hits the ground
    }
    return max(0.0, d);
}
`;

export const transmittanceComputeWGSL = `
#include<atmosphere_common>

@group(0) @binding(0) var dest: texture_storage_2d<rgba16float, write>;
@group(0) @binding(1) var<uniform> params: AtmosphereParams;

const TRANSMITTANCE_STEPS: i32 = 40;

// Parameterization mapping from 2D texture coordinates to physical (r, mu)
fn getTransmittanceRMuFromUV(uv: vec2<f32>, bottom: f32, top: f32) -> vec2<f32> {
    let x_mu = uv.x;
    let x_r = uv.y;
    
    let bottom_sq = bottom * bottom;
    let top_sq = top * top;
    
    // Non-linear mapping for radius
    let H = sqrt(top_sq - bottom_sq);
    let rho = H * x_r;
    let r = sqrt(rho * rho + bottom_sq);
    
    // Non-linear mapping for sun zenith angle
    let dmin = top - r;
    let dmax = rho + H;
    let d = dmin + x_mu * (dmax - dmin);
    
    var mu: f32;
    if (d == 0.0) {
        mu = 1.0;
    } else {
        mu = (H * H - rho * rho - d * d) / (2.0 * r * d);
    }
    
    return vec2<f32>(r, clamp(mu, -1.0, 1.0));
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let resolution = vec2<f32>(256.0, 64.0);
    if (f32(global_id.x) >= resolution.x || f32(global_id.y) >= resolution.y) {
        return;
    }
    
    // Calculate UV at pixel center
    let uv = (vec2<f32>(f32(global_id.x), f32(global_id.y)) + 0.5) / resolution;
    
    let r_mu = getTransmittanceRMuFromUV(uv, params.bottomRadius, params.topRadius);
    let r = r_mu.x;
    let mu = r_mu.y;
    
    let r0 = vec3<f32>(0.0, r, 0.0);
    let rd = vec3<f32>(sqrt(1.0 - mu * mu), mu, 0.0);
    
    let rayLength = fetchRayLengths(r0, rd, params.bottomRadius, params.topRadius);
    var opticalDepth = vec3<f32>(0.0);
    
    if (rayLength > 0.0) {
        let stepSize = rayLength / f32(TRANSMITTANCE_STEPS);
        for (var i = 0; i < TRANSMITTANCE_STEPS; i++) {
            let t = (f32(i) + 0.5) * stepSize;
            let p = r0 + rd * t;
            let altitude = length(p) - params.bottomRadius;
            
            let densities = getAtmosphereDensities(max(0.0, altitude));
            
            let rayleighExt = params.rayleighScattering * densities.x;
            let mieExt = params.mieExtinction * densities.y;
            let ozoneExt = params.ozoneAbsorption * densities.z;
            
            let extinction = rayleighExt + vec3<f32>(mieExt) + ozoneExt;
            opticalDepth += extinction * stepSize;
        }
    }
    
    let transmittance = exp(-opticalDepth);
    textureStore(dest, vec2<i32>(global_id.xy), vec4<f32>(transmittance, 1.0));
}
`;

export const multiscatteringComputeWGSL = `
#include<atmosphere_common>

@group(0) @binding(0) var dest: texture_storage_2d<rgba16float, write>;
@group(0) @binding(1) var transmittanceLUT: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: AtmosphereParams;

const MULTISCATTER_STEPS: i32 = 20;

fn getTransmittance(r: f32, mu: f32) -> vec4<f32> {
    // Re-map (r, mu) to (u,v) for lookup
    let bottom = params.bottomRadius;
    let top = params.topRadius;
    let H = sqrt(top * top - bottom * bottom);
    let rho = sqrt(max(0.0, r * r - bottom * bottom));
    
    let dmin = top - r;
    let dmax = rho + H;
    var d: f32;
    if (r * mu > 0.0) {
        d = r * mu + sqrt(r * r * mu * mu - r * r + top * top);
    } else {
        d = max(0.0, r * mu + sqrt(r * r * mu * mu - r * r + top * top));
    }
    let x_mu = (d - dmin) / (dmax - dmin);
    let x_r = rho / H;
    
    let uv = vec2<f32>(x_mu, x_r);
    let texCoord = vec2<i32>(clamp(uv * vec2<f32>(256.0, 64.0), vec2<f32>(0.0), vec2<f32>(255.0, 63.0)));
    return textureLoad(transmittanceLUT, texCoord, 0);
}

// 2D dispatch over 32x32 covering (r, mu_s) combinations
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let resolution = vec2<f32>(32.0, 32.0);
    if (f32(global_id.x) >= resolution.x || f32(global_id.y) >= resolution.y) {
        return;
    }
    
    // Convert 32x32 to valid coordinates (this is an approximation for performance)
    let uv = (vec2<f32>(f32(global_id.x), f32(global_id.y)) + 0.5) / resolution;
    
    // Same mapping as transmittance for base parameters
    let r = params.bottomRadius + uv.y * (params.topRadius - params.bottomRadius);
    let mu_s = uv.x * 2.0 - 1.0; 
    
    var L2nd = vec3<f32>(0.0);
    var fms = vec3<f32>(0.0);
    
    // Very simplified isotropic multi-scatter estimate
    let r0 = vec3<f32>(0.0, r, 0.0);
    let rd = vec3<f32>(sqrt(1.0 - mu_s * mu_s), mu_s, 0.0);
    let rayLength = fetchRayLengths(r0, rd, params.bottomRadius, params.topRadius);
    
    if (rayLength > 0.0) {
        let stepSize = rayLength / f32(MULTISCATTER_STEPS);
        for (var i = 0; i < MULTISCATTER_STEPS; i++) {
            let t = (f32(i) + 0.5) * stepSize;
            let p = r0 + rd * t;
            let altitude = length(p) - params.bottomRadius;
            let densities = getAtmosphereDensities(max(0.0, altitude));
            
            let scattering = params.rayleighScattering * densities.x + vec3<f32>(params.mieScattering * densities.y);
            
            // Lookup transmittance from the precomputed LUT
            let sampleR = length(p);
            let sampleMu = dot(normalize(p), rd);
            let T = getTransmittance(sampleR, sampleMu);
            
            L2nd += scattering * T.rgb * stepSize;
            fms += scattering * stepSize;
        }
    }
    
    textureStore(dest, vec2<i32>(global_id.xy), vec4<f32>(L2nd + fms * 0.5, 1.0));
}
`;

export const skyviewComputeWGSL = `
#include<atmosphere_common>

@group(0) @binding(0) var dest: texture_storage_2d<rgba16float, write>;
@group(0) @binding(1) var transmittanceLUT: texture_2d<f32>;
@group(0) @binding(2) var multiscatteringLUT: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: AtmosphereParams;

const SKYVIEW_STEPS: i32 = 30;

// Non-linear mapping for the SkyView LUT zenith angle to ensure horizon detail
fn getSkyViewRays(uv: vec2<f32>, r: f32) -> vec2<f32> {
    let bottom = params.bottomRadius;
    let top = params.topRadius;
    
    // Convert UV to View Zenith (mu_v) and View-Sun Azimuth (phi)
    // For simplicity in this approximation, we map:
    // v -> mu_v (Horizon is at v=0.5)
    // u -> phi
    
    var mu_v: f32;
    let v = uv.y;
    if (v < 0.5) {
        // Look down
        let coord = 1.0 - 2.0 * v;
        mu_v = -coord * coord;
    } else {
        // Look up
        let coord = (v - 0.5) * 2.0;
        mu_v = coord * coord;
    }
    
    let phi = (uv.x * 2.0 - 1.0) * 3.14159265;
    
    return vec2<f32>(mu_v, phi);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let resolution = vec2<f32>(192.0, 108.0);
    if (f32(global_id.x) >= resolution.x || f32(global_id.y) >= resolution.y) {
        return;
    }
    
    let uv = (vec2<f32>(f32(global_id.x), f32(global_id.y)) + 0.5) / resolution;
    
    // Camera is temporarily assumed at ground level + epsilon for the 2D SkyView LUT
    // In a full implementation, we re-evaluate this LUT based on camera altitude,
    // or we add altitude as a 3rd dimension (which becomes the Volumetric 3D texture).
    let r = params.bottomRadius + 1.0; 
    let angles = getSkyViewRays(uv, r);
    let mu_v = angles.x;
    let phi = angles.y;
    
    // Sun direction is assumed fixed at Z for the LUT (we rotate the sampling sphere in the shader)
    let sunDir = vec3<f32>(0.0, 0.0, 1.0); // Assuming mu_s = 1.0 for the precompute for now, 
    // Wait, physically the SkyView LUT depends on the current Sun Zenith Angle. 
    // We should pass sun_dir in params, or for now, hardcode a sunset sun_dir as a test.
    // For full parameterization, sunDir needs to be a uniform.
    // Let's assume a generic sunset:
    let sun_mu = 0.1; 
    let sun_d = vec3<f32>(sqrt(1.0 - sun_mu * sun_mu), sun_mu, 0.0);
    
    let r0 = vec3<f32>(0.0, r, 0.0);
    let rd = vec3<f32>(
        sqrt(1.0 - mu_v * mu_v) * cos(phi),
        mu_v,
        sqrt(1.0 - mu_v * mu_v) * sin(phi)
    );
    
    let rayLength = fetchRayLengths(r0, rd, params.bottomRadius, params.topRadius);
    
    var L = vec3<f32>(0.0);
    var transmittance = vec3<f32>(1.0);
    
    if (rayLength > 0.0) {
        let stepSize = rayLength / f32(SKYVIEW_STEPS);
        for (var i = 0; i < SKYVIEW_STEPS; i++) {
            let t = (f32(i) + 0.5) * stepSize;
            let p = r0 + rd * t;
            let altitude = length(p) - params.bottomRadius;
            let densities = getAtmosphereDensities(max(0.0, altitude));
            
            let rayleighExt = params.rayleighScattering * densities.x;
            let mieExt = params.mieExtinction * densities.y;
            let ozoneExt = params.ozoneAbsorption * densities.z;
            let extinction = rayleighExt + vec3<f32>(mieExt) + ozoneExt;
            
            let dt = exp(-extinction * stepSize);
            
            // Single Scattering approximation
            let rayleighScat = params.rayleighScattering * densities.x;
            let mieScat = params.mieScattering * densities.y;
            
            // Phase functions (isotropic for now to get colors working)
            let phaseR = 0.0596831; // 3/(16pi)
            let phaseM = 0.0795775; // 1/(4pi)
            
            // Fetch transmittance to sun from the precomputed LUT
            let sampleR = length(p);
            let sampleMu = dot(normalize(p), sun_d);
            let tUV = vec2<f32>(
                clamp((sampleMu + 1.0) * 0.5, 0.0, 1.0),
                clamp((sampleR - params.bottomRadius) / (params.topRadius - params.bottomRadius), 0.0, 1.0)
            );
            let tCoord = vec2<i32>(clamp(tUV * vec2<f32>(256.0, 64.0), vec2<f32>(0.0), vec2<f32>(255.0, 63.0)));
            let sunTransmittance = textureLoad(transmittanceLUT, tCoord, 0).rgb;
            
            // Fetch multiscattering contribution
            let msUV = vec2<f32>(
                clamp((sampleMu + 1.0) * 0.5, 0.0, 1.0),
                clamp((sampleR - params.bottomRadius) / (params.topRadius - params.bottomRadius), 0.0, 1.0)
            );
            let msCoord = vec2<i32>(clamp(msUV * vec2<f32>(32.0, 32.0), vec2<f32>(0.0), vec2<f32>(31.0, 31.0)));
            let ms = textureLoad(multiscatteringLUT, msCoord, 0).rgb;
            
            let S = (rayleighScat * phaseR + vec3<f32>(mieScat * phaseM)) * sunTransmittance + ms * rayleighScat;
            let Sint = (S - S * dt) / max(vec3<f32>(0.00001), extinction);
            
            L += transmittance * Sint;
            transmittance *= dt;
        }
    }
    
    textureStore(dest, vec2<i32>(global_id.xy), vec4<f32>(L, 1.0));
}
`;
