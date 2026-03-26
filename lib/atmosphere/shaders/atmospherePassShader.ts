export const atmospherePassWGSL = `
var textureSampler : texture_2d<f32>;
var textureSamplerSampler : sampler;
var transmittanceLUT : texture_2d<f32>;
var transmittanceLUTSampler : sampler;

uniform planetRadius : f32;
uniform atmoTop : f32;
uniform camPos : vec3<f32>;
uniform sunDir : vec3<f32>;
uniform camFwd : vec3<f32>;
uniform camRight : vec3<f32>;
uniform camUp : vec3<f32>;
uniform tanFov : f32;
uniform aspectRatio : f32;

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

fn sampleTransmittanceLUT(r: f32, mu: f32) -> vec4<f32> {
    let r_mu = clamp(mu, -1.0, 1.0);
    let bottom = 5.0;
    let top = 5.15;
    
    let H = sqrt(top * top - bottom * bottom);
    let rho = sqrt(max(0.0, r * r - bottom * bottom));
    
    let dmin = top - r;
    let dmax = rho + H;
    var d: f32;
    if (r_mu == 1.0) {
        d = 0.0;
    } else {
        d = max(0.0, -r * r_mu + sqrt(r * r * r_mu * r_mu + top * top - r * r));
    }
    
    let x_mu = (d - dmin) / (dmax - dmin);
    let x_r = rho / H;
    
    let uv = vec2<f32>(clamp(x_mu, 0.0, 1.0), clamp(x_r, 0.0, 1.0));
    return textureSampleLevel(transmittanceLUT, transmittanceLUTSampler, uv, 0.0);
}

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    let sceneColor = textureSample(textureSampler, textureSamplerSampler, input.vUV);
    
    // Construct ray from camera vectors
    let ro = uniforms.camPos;
    let uvx = input.vUV.x * 2.0 - 1.0;
    let uvy = input.vUV.y * 2.0 - 1.0;
    let rd = normalize(
        uniforms.camFwd
        + uniforms.camRight * uvx * uniforms.tanFov * uniforms.aspectRatio
        + uniforms.camUp * uvy * uniforms.tanFov
    );

    var atmoColor = vec3<f32>(0.0);
    var atmoTransmittance = vec3<f32>(1.0);
    
    let atmoInt = raySphereIntersect(ro, rd, vec3<f32>(0.0), uniforms.atmoTop);
    
    if (atmoInt.y > 0.0) {
        let t_min = max(0.0, atmoInt.x);
        var t_max = atmoInt.y;
        
        let pPlanet = raySphereIntersect(ro, rd, vec3<f32>(0.0), uniforms.planetRadius);
        if (pPlanet.x > 0.0) {
            t_max = min(t_max, pPlanet.x);
        }
        
        if (t_max > t_min) {
            let atmoSteps = 16.0;
            let stepSize = (t_max - t_min) / atmoSteps;
            var t_atmo = t_min + stepSize * 0.5;
            
            for (var i = 0.0; i < atmoSteps; i += 1.0) {
                let p = ro + rd * t_atmo;
                let r = length(p);
                
                // Proportional physical altitude mapping (5.0 -> 6360km Earth equivalent)
                let alt = (r - uniforms.planetRadius) * (6360.0 / 5.0); 
                let rayleighDensity = exp(-alt / 8.0);
                let mieDensity = exp(-alt / 1.2);
                
                // Boosted physical rayleigh multiplier specifically to map visible cinematic halos 
                // scaled appropriately for the 5.0 -> 5.15 squished geometric proportion.
                let rScatter = vec3<f32>(0.0058, 0.0135, 0.0331) * 3500.0; 
                let mScatter = vec3<f32>(0.004) * 1500.0;
                let ext = rScatter * rayleighDensity + mScatter * mieDensity * 1.5;
                
                let stepT = exp(-ext * stepSize);
                
                // Integrate Phase 01 native TransmittanceLUT for real planetary shadows
                let mu_p = dot(normalize(p), uniforms.sunDir);
                let sunLight = sampleTransmittanceLUT(clamp(r, uniforms.planetRadius, uniforms.atmoTop), mu_p).rgb;
                
                // EGSR 2020 Phase Functions
                let cosTheta = dot(rd, uniforms.sunDir);
                let rPhase = 0.05968 * (1.0 + cosTheta * cosTheta);
                let g = 0.8;
                let denom = 1.0 + g*g - 2.0*g*cosTheta;
                let mPhase = 0.11936 * (1.0 - g*g) / (pow(denom, 1.5));
                
                let S = sunLight * 6.0 * (rScatter * rayleighDensity * rPhase + mScatter * mieDensity * mPhase);
                let Sint = (S - S * stepT) / max(vec3<f32>(0.0001), ext);
                
                atmoColor += atmoTransmittance * Sint;
                atmoTransmittance *= stepT;
                t_atmo += stepSize;
            }
        }
    }

    let finalColor = sceneColor.rgb * atmoTransmittance + atmoColor;
    var fragmentOutputs : FragmentOutputs;
    fragmentOutputs.color = vec4<f32>(finalColor, 1.0);
    return fragmentOutputs;
}
`;
