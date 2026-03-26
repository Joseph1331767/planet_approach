import { Engine, ComputeShader, Effect, RawTexture, Constants, Vector3 } from "@babylonjs/core";
import { WebGPUComputeDispatcher } from "../WebGPUComputeDispatcher";
import { AtmosphereParams } from "../../config/AtmosphereParams";

export function runFloatingOriginTest(): boolean {
    console.log("[Atmosphere Test] Running Floating Origin Test...");
    const params = new AtmosphereParams(6360.0, 6460.0, new Vector3(0, -6360.0, 0));
    
    // Test point mathematically at the surface, but rendering at global (0,0,0)
    const surfaceAlt = params.getAltitudeRelativeToSeaLevel(new Vector3(0, 0, 0));
    // Test point 100 units above surface
    const spaceAlt = params.getAltitudeRelativeToSeaLevel(new Vector3(0, 100.0, 0));
    
    console.log(`[Atmosphere Test] Surface Alt (Expected 0):`, surfaceAlt);
    console.log(`[Atmosphere Test] Space Alt (Expected 100):`, spaceAlt);
    
    return Math.abs(surfaceAlt) < 0.001 && Math.abs(spaceAlt - 100.0) < 0.001;
}

export async function runDummyWGSLTest(engine: Engine, dispatcher: WebGPUComputeDispatcher): Promise<boolean> {
    if (!dispatcher.canDispatch()) {
        console.warn("[Atmosphere Test] Cannot run WGSL test (WebGPU unsupported).");
        return false;
    }

    try {
        console.log("[Atmosphere Test] Compiling Dummy WGSL Compute Shader...");
        
        // Define standard WGSL compute shader
        const computeSource = `
            @group(0) @binding(0) var dest : texture_storage_2d<rgba8unorm, write>;
            
            @compute @workgroup_size(8, 8, 1)
            fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
                let pos = vec2<i32>(global_id.xy);
                textureStore(dest, pos, vec4<f32>(1.0, 0.0, 0.0, 1.0));
            }
        `;
        
        const cs = dispatcher.createComputeShader("dummyCS", computeSource, {
            "dest": { group: 0, binding: 0 }
        });

        if (!cs) throw new Error("ComputeShader instantiation failed.");

        // Create a basic 8x8 storage texture
        const texture = RawTexture.CreateRGBATexture(
            new Uint8Array(256), // 8x8x4
            8, 8,
            engine,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_UNSIGNED_INT
        );
        
        // Ensure texture can be used for storage (requires WebGPU specific flag in internal texture)
        // Babylon handles this natively when binding a texture to a ComputeShader as a StorageTexture.
        cs.setTexture("dest", texture);

        console.log("[Atmosphere Test] Dispatching Workgroups...");
        cs.dispatch(1, 1, 1);

        console.log("[Atmosphere Test] WGSL Dummy Test Dispatched successfully.");
        return true;
    } catch (e) {
        console.error("[Atmosphere Test] WGSL Compute failed:", e);
        return false;
    }
}
