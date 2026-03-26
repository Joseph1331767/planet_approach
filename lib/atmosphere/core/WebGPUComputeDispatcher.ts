import { Engine, ComputeShader, WebGPUEngine } from "@babylonjs/core";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";

export class WebGPUComputeDispatcher {
  private engine: Engine;
  private isSupported: boolean = false;

  constructor(engine: Engine) {
    this.engine = engine;
    this.verifySupport();
  }

  private verifySupport() {
    // In Babylon 7+, we can check if it's an instance of WebGPUEngine or has WebGPU flags
    if (this.engine.name === "WebGPUEngine" || this.engine.isWebGPU) {
      this.isSupported = true;
      console.log("[Atmosphere] WebGPU Compute Dispatcher initialized successfully.");
    } else {
      this.isSupported = false;
      console.warn("[Atmosphere] WebGL fallback detected. Advanced Atmospheric Compute passes are disabled.");
    }
  }

  public canDispatch(): boolean {
    return this.isSupported;
  }

  /**
   * Helper payload to initialize the Dispatcher.
   */
  public getEngine(): Engine {
    return this.engine;
  }

  /**
   * Wrapper for creating a WebGPU ComputeShader attached to this dispatcher.
   * @param name - The name of the shader instance
   * @param sourceCode - The raw WGSL code
   * @param bindings - The specific WebGPU bindings map required by the WGSL code
   * @returns ComputeShader instance or null if unsupported.
   */
  public createComputeShader(
    name: string,
    sourceCode: string,
    bindings: any
  ): ComputeShader | null {
    if (!this.isSupported) {
      console.warn(`[Atmosphere] Cannot create compute shader ${name}: WebGPU is not supported.`);
      return null;
    }

    const storeKey = `${name}ComputeShader`;
    ShaderStore.ShadersStoreWGSL[storeKey] = sourceCode;

    // Pass a plain string so Babylon resolves via ShaderStore:
    //   ShadersStoreWGSL[name + "ComputeShader"]
    // Do NOT pass { computeSource: ... } — that treats the value as raw inline code.
    // Do NOT set entryPoint — it injects "#define main" (invalid WGSL).
    return new ComputeShader(
      name,
      this.engine,
      name,
      { bindingsMapping: bindings }
    );
  }
}
