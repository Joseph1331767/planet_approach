import { Engine, UniformBuffer, Constants, Texture, ComputeShader, Scene, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
import { WebGPUComputeDispatcher } from "./WebGPUComputeDispatcher";
import { AtmosphereParams } from "../config/AtmosphereParams";
import { AtmosphereScatteringParams } from "../config/AtmosphereScatteringParams";
import { atmosphereCommonWGSL, transmittanceComputeWGSL, multiscatteringComputeWGSL, skyviewComputeWGSL } from "../shaders/atmosphereShaders";
export enum PipelineState {
  INITIALIZING = 0,
  BUILDING_LUTS = 1,
  READY = 2,
  ERROR = 3
}

/**
 * The master orchestrator for the Chunk 03 Atmospheric Rendering pipeline.
 * Manages the lifecycle of compute dispatches, LUT storage, and phase integration.
 */
export class AtmospherePipeline {
  private state: PipelineState = PipelineState.INITIALIZING;
  private engine: Engine;
  
  public dispatcher: WebGPUComputeDispatcher;
  public params: AtmosphereParams;
  public scatteringParams: AtmosphereScatteringParams;

  // GPU Resources
  private ubo!: UniformBuffer;
  public transmittanceTexture!: Texture;
  public multiscatteringTexture!: Texture;
  public skyviewTexture!: Texture;
  
  // Shaders
  private transmittanceCS: ComputeShader | null = null;
  private multiscatteringCS: ComputeShader | null = null;
  private skyviewCS: ComputeShader | null = null;
  
  // Debug
  private debugPlanes: import("@babylonjs/core").Mesh[] = [];

  // Deferred dispatch flag
  private _dispatchPending = false;

  constructor(engine: Engine) {
    this.engine = engine;
    this.dispatcher = new WebGPUComputeDispatcher(engine);
    this.params = new AtmosphereParams();

    this.scatteringParams = new AtmosphereScatteringParams();

    if (!this.dispatcher.canDispatch()) {
      this.state = PipelineState.ERROR;
      return;
    }

    this.state = PipelineState.BUILDING_LUTS;
    ShaderStore.IncludesShadersStoreWGSL["atmosphere_common"] = atmosphereCommonWGSL;

    this.initResources();
    this.compileAndBindShaders();
    
    // Initial dispatch — safe because we are still in construction (no render loop yet)
    this._doDispatchAll();
    
    this.state = PipelineState.READY;
  }

  private initResources() {
    // 1. Uniform Buffer
    this.ubo = new UniformBuffer(this.engine, undefined, true, "AtmosphereParams");
    this.ubo.addUniform("rayleighScattering", 3);
    this.ubo.addUniform("padding1", 1);
    this.ubo.addUniform("mieScattering", 1);
    this.ubo.addUniform("mieExtinction", 1);
    this.ubo.addUniform("mieAsymmetry", 1);
    this.ubo.addUniform("bottomRadius", 1);
    this.ubo.addUniform("ozoneAbsorption", 3);
    this.ubo.addUniform("topRadius", 1);
    this.ubo.create();
    this.syncUniforms();

    // 2. Storage Textures — must have TEXTURE_CREATIONFLAG_STORAGE for WebGPU write access
    const storageFlag = Constants.TEXTURE_CREATIONFLAG_STORAGE;

    const transInternal = this.engine.createRawTexture(
      new Float32Array(256 * 64 * 4),
      256, 64, Constants.TEXTUREFORMAT_RGBA, false, false, Constants.TEXTURE_NEAREST_SAMPLINGMODE,
      null, Constants.TEXTURETYPE_HALF_FLOAT, storageFlag
    );
    this.transmittanceTexture = new Texture(null, this.engine);
    this.transmittanceTexture._texture = transInternal;

    const msInternal = this.engine.createRawTexture(
      new Float32Array(32 * 32 * 4),
      32, 32, Constants.TEXTUREFORMAT_RGBA, false, false, Constants.TEXTURE_NEAREST_SAMPLINGMODE,
      null, Constants.TEXTURETYPE_HALF_FLOAT, storageFlag
    );
    this.multiscatteringTexture = new Texture(null, this.engine);
    this.multiscatteringTexture._texture = msInternal;

    const svInternal = this.engine.createRawTexture(
      new Float32Array(192 * 108 * 4),
      192, 108, Constants.TEXTUREFORMAT_RGBA, false, false, Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
      null, Constants.TEXTURETYPE_HALF_FLOAT, storageFlag
    );
    this.skyviewTexture = new Texture(null, this.engine);
    this.skyviewTexture._texture = svInternal;
  }

  public syncUniforms() {
    if (!this.ubo) return;
    const b = this.params.getBounds();
    const r = this.scatteringParams.rayleighScattering;
    const o = this.scatteringParams.ozoneAbsorption;
    
    this.ubo.updateFloat3("rayleighScattering", r.x, r.y, r.z);
    this.ubo.updateFloat("mieScattering", this.scatteringParams.mieScattering);
    this.ubo.updateFloat("mieExtinction", this.scatteringParams.mieExtinction);
    this.ubo.updateFloat("mieAsymmetry", this.scatteringParams.mieAsymmetry);
    this.ubo.updateFloat("bottomRadius", b.bottomRadius);
    this.ubo.updateFloat3("ozoneAbsorption", o.x, o.y, o.z);
    this.ubo.updateFloat("topRadius", b.topRadius);
    this.ubo.update();
  }

  /**
   * Compile all shaders AND bind their resources ONCE.
   * Bindings are persistent — only uniform data changes on redispatch.
   */
  private compileAndBindShaders() {
    // --- Transmittance ---
    this.transmittanceCS = this.dispatcher.createComputeShader(
      "transmittance",
      transmittanceComputeWGSL,
      {
        "dest": { group: 0, binding: 0 },
        "params": { group: 0, binding: 1 }
      }
    );
    if (this.transmittanceCS) {
      this.transmittanceCS.setStorageTexture("dest", this.transmittanceTexture);
      this.transmittanceCS.setUniformBuffer("params", this.ubo);
    }

    // --- Multiscattering ---
    this.multiscatteringCS = this.dispatcher.createComputeShader(
      "multiscattering",
      multiscatteringComputeWGSL,
      {
        "dest": { group: 0, binding: 0 },
        "transmittanceLUT": { group: 0, binding: 1 },
        "params": { group: 0, binding: 2 }
      }
    );
    if (this.multiscatteringCS) {
      this.multiscatteringCS.setStorageTexture("dest", this.multiscatteringTexture);
      this.multiscatteringCS.setTexture("transmittanceLUT", this.transmittanceTexture, false);
      this.multiscatteringCS.setUniformBuffer("params", this.ubo);
    }

    // --- SkyView ---
    this.skyviewCS = this.dispatcher.createComputeShader(
      "skyview",
      skyviewComputeWGSL,
      {
        "dest": { group: 0, binding: 0 },
        "transmittanceLUT": { group: 0, binding: 1 },
        "multiscatteringLUT": { group: 0, binding: 2 },
        "params": { group: 0, binding: 3 }
      }
    );
    if (this.skyviewCS) {
      this.skyviewCS.setStorageTexture("dest", this.skyviewTexture);
      this.skyviewCS.setTexture("transmittanceLUT", this.transmittanceTexture, false);
      this.skyviewCS.setTexture("multiscatteringLUT", this.multiscatteringTexture, false);
      this.skyviewCS.setUniformBuffer("params", this.ubo);
    }
  }

  /** Internal: runs all three dispatches synchronously (bindings already set) */
  private _doDispatchAll() {
    this.syncUniforms();
    if (this.transmittanceCS) {
      this.transmittanceCS.dispatch(Math.ceil(256 / 8), Math.ceil(64 / 8), 1);
    }
    if (this.multiscatteringCS) {
      this.multiscatteringCS.dispatch(Math.ceil(32 / 8), Math.ceil(32 / 8), 1);
    }
    if (this.skyviewCS) {
      this.skyviewCS.dispatch(Math.ceil(192 / 8), Math.ceil(108 / 8), 1);
    }
  }

  /**
   * Schedule a deferred re-dispatch of all LUTs.
   * Safe to call from React event handlers / config subscriptions.
   * Defers GPU work to the next animation frame to avoid command encoder conflicts.
   */
  public scheduleRedispatch() {
    if (this._dispatchPending) return; // coalesce multiple calls
    this._dispatchPending = true;
    requestAnimationFrame(() => {
      this._dispatchPending = false;
      this._doDispatchAll();
    });
  }

  // Keep individual dispatch methods for direct use during construction
  public dispatchTransmittance() {
    if (!this.transmittanceCS) return;
    this.syncUniforms();
    this.transmittanceCS.dispatch(Math.ceil(256 / 8), Math.ceil(64 / 8), 1);
  }

  public dispatchMultiscattering() {
    if (!this.multiscatteringCS) return;
    this.syncUniforms();
    this.multiscatteringCS.dispatch(Math.ceil(32 / 8), Math.ceil(32 / 8), 1);
  }

  public dispatchSkyView() {
    if (!this.skyviewCS) return;
    this.syncUniforms();
    this.skyviewCS.dispatch(Math.ceil(192 / 8), Math.ceil(108 / 8), 1);
  }

  public showDebugPlanes(scene: Scene, show: boolean) {
    if (show && this.debugPlanes.length === 0) {
      const cam = scene.activeCamera;
      const trans = MeshBuilder.CreatePlane("debugTrans", { width: 1.0, height: 0.25 }, scene);
      trans.parent = cam;
      trans.position.set(-1.2, -0.8, 3);
      const mat1 = new StandardMaterial("mat1", scene);
      mat1.emissiveTexture = this.transmittanceTexture;
      mat1.disableLighting = true;
      mat1.backFaceCulling = false;
      trans.material = mat1;

      const multi = MeshBuilder.CreatePlane("debugMulti", { size: 1.0 }, scene);
      multi.parent = cam;
      multi.position.set(0, -0.8, 3);
      const mat2 = new StandardMaterial("mat2", scene);
      mat2.emissiveTexture = this.multiscatteringTexture;
      mat2.disableLighting = true;
      mat2.backFaceCulling = false;
      multi.material = mat2;

      const sky = MeshBuilder.CreatePlane("debugSky", { width: 1.6, height: 0.9 }, scene);
      sky.parent = cam;
      sky.position.set(1.5, -0.8, 3);
      const mat3 = new StandardMaterial("mat3", scene);
      mat3.emissiveTexture = this.skyviewTexture;
      mat3.disableLighting = true;
      mat3.backFaceCulling = false;
      sky.material = mat3;

      this.debugPlanes.push(trans, multi, sky);
    }
    for (let mesh of this.debugPlanes) {
      mesh.isVisible = show;
    }
  }

  public getState(): PipelineState {
    return this.state;
  }
}
