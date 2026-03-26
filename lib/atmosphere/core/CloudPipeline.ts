import { Engine, Scene, Constants, Texture, ComputeShader, RawTexture, RawTexture3D } from "@babylonjs/core";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
import { WebGPUComputeDispatcher } from "./WebGPUComputeDispatcher";
import { 
    noiseCommonWGSL, 
    noiseBaseComputeWGSL, 
    noiseDetailComputeWGSL, 
    weatherMapComputeWGSL 
} from "../shaders/cloudShaders";

export enum CloudPipelineState {
    INITIALIZING = 0,
    BUILDING_NOISE = 1,
    READY = 2,
    ERROR = 3
}

/**
 * Orchestrator for Phase 02 Global Clouds.
 * Generates and stores 3D Procedural Noises and Stochastic Weather Maps.
 */
export class CloudPipeline {
    private state: CloudPipelineState = CloudPipelineState.INITIALIZING;
    private engine: Engine;
    private scene: Scene;
    public dispatcher: WebGPUComputeDispatcher;

    public baseNoiseTexture!: Texture;
    public detailNoiseTexture!: Texture;
    public weatherMapTexture!: Texture;

    private baseNoiseCS: ComputeShader | null = null;
    private detailNoiseCS: ComputeShader | null = null;
    private weatherMapCS: ComputeShader | null = null;

    constructor(engine: Engine, scene: Scene, dispatcher: WebGPUComputeDispatcher) {
        this.engine = engine;
        this.scene = scene;
        this.dispatcher = dispatcher;

        if (!this.dispatcher.canDispatch()) {
            this.state = CloudPipelineState.ERROR;
            return;
        }

        this.state = CloudPipelineState.BUILDING_NOISE;
        
        // Register the common noise functions
        ShaderStore.IncludesShadersStoreWGSL["noise_common"] = noiseCommonWGSL;

        this.initResources();
        this.compileAndBindShaders();
        this.dispatchOnce();

        this.state = CloudPipelineState.READY;
    }

    private initResources() {
        const storageFlag = Constants.TEXTURE_CREATIONFLAG_STORAGE;
        const rgbaFormat = Constants.TEXTUREFORMAT_RGBA;
        const ubyteType = Constants.TEXTURETYPE_UNSIGNED_BYTE;
        const triSampling = Constants.TEXTURE_TRILINEAR_SAMPLINGMODE;
        const biSampling = Constants.TEXTURE_BILINEAR_SAMPLINGMODE;

        // 1. Base 128^3 Perlin-Worley Noise - MUST be a RawTexture3D so Babylon knows it's 3D
        this.baseNoiseTexture = new RawTexture3D(
            new Uint8Array(128 * 128 * 128 * 4),
            128, 128, 128,
            rgbaFormat,
            this.scene, // Passed the real scene here
            false, // generateMipmaps
            false, // invertY
            triSampling,
            ubyteType,
            storageFlag
        );
        this.baseNoiseTexture.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.baseNoiseTexture.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.baseNoiseTexture.wrapR = Constants.TEXTURE_WRAP_ADDRESSMODE;

        // 2. Detail 32^3 Worley Noise - MUST be a RawTexture3D
        this.detailNoiseTexture = new RawTexture3D(
            new Uint8Array(32 * 32 * 32 * 4),
            32, 32, 32,
            rgbaFormat,
            this.scene, // Passed the real scene here
            false, // generateMipmaps
            false, // invertY
            triSampling,
            ubyteType,
            storageFlag
        );
        this.detailNoiseTexture.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.detailNoiseTexture.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
        this.detailNoiseTexture.wrapR = Constants.TEXTURE_WRAP_ADDRESSMODE;

        // 3. Stochastic Weather Map (1024x1024 2D) - RawTexture supports 2D natively
        this.weatherMapTexture = RawTexture.CreateRGBATexture(
            new Uint8Array(1024 * 1024 * 4),
            1024, 1024,
            this.engine,
            false, // generateMipmaps
            false, // invertY
            biSampling,
            ubyteType,
            storageFlag // PASS CREATION FLAG HERE
        );
        this.weatherMapTexture.updateURL("weatherMap"); // dummy name
    }

    private compileAndBindShaders() {
        this.baseNoiseCS = this.dispatcher.createComputeShader(
            "noiseBase",
            noiseBaseComputeWGSL,
            { "dest": { group: 0, binding: 0 } }
        );
        if (this.baseNoiseCS) {
            this.baseNoiseCS.setStorageTexture("dest", this.baseNoiseTexture);
        }

        this.detailNoiseCS = this.dispatcher.createComputeShader(
            "noiseDetail",
            noiseDetailComputeWGSL,
            { "dest": { group: 0, binding: 0 } }
        );
        if (this.detailNoiseCS) {
            this.detailNoiseCS.setStorageTexture("dest", this.detailNoiseTexture);
        }

        this.weatherMapCS = this.dispatcher.createComputeShader(
            "weatherMap",
            weatherMapComputeWGSL,
            { "dest": { group: 0, binding: 0 } }
        );
        if (this.weatherMapCS) {
            this.weatherMapCS.setStorageTexture("dest", this.weatherMapTexture);
        }
    }

    private dispatchOnce() {
        // Base Noise (128^3): Workgroup is 4x4x4 -> Dispatch is 32x32x32
        if (this.baseNoiseCS) {
            this.baseNoiseCS.dispatchWhenReady(32, 32, 32).then(() => {
                console.log("[CloudPipeline] Base Noise 128^3 computed successfully.");
            });
        }
        // Detail Noise: 32 / 4 = 8
        if (this.detailNoiseCS) {
            this.detailNoiseCS.dispatchWhenReady(8, 8, 8).then(() => {
                console.log("[CloudPipeline] Detail Noise 32^3 computed successfully.");
            });
        }
        // Weather Map: 1024 / 8 = 128
        if (this.weatherMapCS) {
            this.weatherMapCS.dispatchWhenReady(128, 128, 1).then(() => {
                console.log("[CloudPipeline] Weather Map 1024^2 computed successfully.");
            });
        }
    }

    public getState(): CloudPipelineState {
        return this.state;
    }
}
