# Chunk 02 Phase 00: Core Engine Research

## Objective
To establish a perfectly isolated Babylon.js library component that loads an external `.glb` representing the dashboard cockpit, ensuring zero memory leaks or global state pollution.

## AAA Implementation Techniques

### 1. Isolated `Engine` and `Scene` Disposal
- **The Issue:** When a minigame is designed as a standalone Promise module, failing to completely dispose of the Babylon `Engine` and `Scene` will lead to massive memory leaks, causing the master application to eventually crash.
- **AAA Implementation:** The minigame's orchestrator must track its own `HTMLCanvasElement`. Upon the Promise resolution (End of Phase 04), the module must sequentially call `scene.dispose()`, `engine.dispose()`, and then explicitly call `.remove()` on the canvas DOM element. Finally, nullify the references to aid the browser's Garbage Collector.

### 2. GLB Loading Optimization
- **The Issue:** Loading large `.glb` files asynchronously can cause a noticeable "snap" or lag spike right as the minigame starts.
- **AAA Implementation:** Use `SceneLoader.AppendAsync` rather than `ImportMeshAsync` if the GLB constitutes the entire environment skeleton. More importantly, utilize Babylon's `AssetContainer` if we need to load the GLB *before* the minigame actually starts tracking time, holding it in memory and applying it to the scene only exactly when the Orchestrator hits `State.ALIGN`.

### 3. GLB UI Mounting (AdvancedDynamicTexture)
- **The Issue:** We need the React `HolographicDashboard` logic to render text *onto* the 3D GLB mesh.
- **AAA Implementation:** The external `.glb` must be constructed with designated "Screen" or "Glass" plane nodes. We will query the loaded GLB (e.g., `scene.getMeshByName("UI_Terminal_Screen")`) and attach a Babylon `AdvancedDynamicTexture.CreateForMesh` specifically to that node. This translates crisp 2D GUI elements onto the 3D geometry seamlessly, inheriting the camera's lighting and shake.
