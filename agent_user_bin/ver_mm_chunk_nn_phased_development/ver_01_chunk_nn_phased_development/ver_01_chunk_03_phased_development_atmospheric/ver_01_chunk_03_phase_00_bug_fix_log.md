# Bug Fix Log: Phase 00 WebGPU Infrastructure

This document logs critical technical fixes applied during the initial WebGPU compute handshake for Chunk 03 (Atmospheric Rendering).

---

## 🐞 Bug 01: WebGPU Device SwapChain Mismatch
**Symptom**: Console error `[TextureView "TextureView_SwapChain_ResolveTarget"] is associated with [Device "BabylonWebGPUDevice1"], and cannot be used with [Device "BabylonWebGPUDevice0"]`.
**Root Cause**: React 18 `StrictMode` double-invokes `useEffect` in development. Since `MinigameOrchestrator.start()` is an `async` method involving `await webgpu.initAsync()`, the first mount was being unmounted before the engine fully initialized. The second mount spawned a *new* engine/device on the same canvas while the first was still alive.
**Fix**: Added a robust state check immediately after engine initialization. If `currentState` has been set to `END` (which happens in the `useEffect` cleanup) during the `await` window, we exit and `dispose()` the new engine immediately.

```typescript
// Fix in MinigameOrchestrator.ts
await webgpu.initAsync();
if ((this.currentState as any) === MinigameState.END) {
    webgpu.dispose();
    return this.minigamePromise;
}
```

---

## 🐞 Bug 02: WGSL Generic Parser Failure (Unexpected Token)
**Symptom**: `Error while parsing WGSL: :3:1 error: unexpected token dummyCS`.
**Root Cause**: Babylon.js `ComputeShader` constructor treats an object `{ computeSource: x }` as **inline code**, but treats a plain string `x` as a **ShaderStore key**. When passed as an object, it was trying to compile the literal string `"dummyCS"` as WGSL code.
**Fix**: Modified the `WebGPUComputeDispatcher` to pass the name as a plain string, ensuring Babylon performs a lookup in `ShadersStoreWGSL`.

---

## 🐞 Bug 03: ShaderStore Double-Suffixing
**Symptom**: Shader failed to compile because it couldn't be found in the store.
**Root Cause**: Babylon internally appends `"ComputeShader"` to the key. We were storing under `dummyCSComputeShader` and passing `dummyCSComputeShader` as the key, resulting in a lookup for `dummyCSComputeShaderComputeShader`.
**Fix**: Pass only the base name (e.g., `dummyCS`) to the constructor.

---

## 🐞 Bug 04: Invalid WGSL Preamble (Invalid #define)
**Symptom**: `Line 3, Offset 61... error: unexpected token #define main`.
**Root Cause**: Passing `entryPoint: "main"` to the `ComputeShader` options caused Babylon to inject `#define main` (GLSL style) into the WGSL shader preamble. WGSL does not support standard C-style `#define` macros.
**Fix**: Removed the `entryPoint` option. Babylon defaults to `main` for standard dispatches without injecting invalid macro syntax into WGSL.

---

## Final Verification Result
- **Gate 1 (Compilation)**: PASSED ✅
- **Gate 2 (Fallback)**: PASSED ✅
- **Floating Origin Math**: PASSED ✅ (6360 - 6360 = 0)
